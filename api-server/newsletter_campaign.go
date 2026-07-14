package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/yuin/goldmark"
)

// Newsletter campaigns: draft → sending → sent. Admins compose markdown,
// the sender worker fans out per-recipient emails with HMAC-signed
// one-click unsubscribe links (RFC 8058).

const (
	campaignStatusDraft   = "draft"
	campaignStatusSending = "sending"
	campaignStatusSent    = "sent"

	deliveryStatusPending = "pending"
	deliveryStatusSent    = "sent"
	deliveryStatusFailed  = "failed"

	campaignSourceManual  = "manual"
	campaignSourceBlogRSS = "blog-rss"

	maxCampaignTitleLen   = 200
	maxCampaignSubjectLen = 200
	maxCampaignBodyLen    = 100_000

	campaignQueueSize  = 100
	deliveryBatchSize  = 25
	defaultSendDelayMs = 1000
)

var (
	campaignQueue = make(chan int64, campaignQueueSize)

	tokenSecret     []byte
	tokenSecretOnce sync.Once

	mdRenderer = goldmark.New()
)

// --- Configuration helpers ---

func newsletterFromEmail() string {
	return getEnv("NEWSLETTER_FROM_EMAIL", "news@nukehub.org")
}

func blogFromEmail() string {
	return getEnv("BLOG_FROM_EMAIL", "blog@nukehub.org")
}

func newsletterFromName() string {
	return getEnv("NEWSLETTER_FROM_NAME", "NukeHub")
}

func siteURL() string {
	return strings.TrimSuffix(getEnv("SITE_URL", "https://nukehub.org"), "/")
}

func apiPublicURL() string {
	return strings.TrimSuffix(getEnv("API_PUBLIC_URL", "https://api.nukehub.org"), "/")
}

// allowedFromAddresses returns the configured sender addresses, deduplicated
// so pointing both env vars at one mailbox yields a single choice.
func allowedFromAddresses() []string {
	seen := map[string]bool{}
	var addresses []string
	for _, addr := range []string{newsletterFromEmail(), blogFromEmail()} {
		if key := strings.ToLower(addr); !seen[key] {
			seen[key] = true
			addresses = append(addresses, addr)
		}
	}
	return addresses
}

func isAllowedFromAddress(addr string) bool {
	for _, allowed := range allowedFromAddresses() {
		if strings.EqualFold(addr, allowed) {
			return true
		}
	}
	return false
}

func sendDelay() time.Duration {
	ms, err := strconv.Atoi(getEnv("NEWSLETTER_SEND_DELAY_MS", ""))
	if err != nil || ms < 0 {
		ms = defaultSendDelayMs
	}
	return time.Duration(ms) * time.Millisecond
}

// getTokenSecret returns the HMAC key for unsubscribe tokens. Without
// NEWSLETTER_TOKEN_SECRET a random key is generated, which invalidates
// tokens already sent out whenever the server restarts.
func getTokenSecret() []byte {
	tokenSecretOnce.Do(func() {
		secret := os.Getenv("NEWSLETTER_TOKEN_SECRET")
		if secret == "" {
			tokenSecret = make([]byte, 32)
			if _, err := rand.Read(tokenSecret); err != nil {
				fmt.Fprintf(os.Stderr, "Failed to generate newsletter token secret: %v\n", err)
				os.Exit(1)
			}
			fmt.Fprintln(os.Stderr, "WARNING: NEWSLETTER_TOKEN_SECRET is not set; generated an ephemeral secret. Unsubscribe links stop working across restarts.")
			return
		}
		tokenSecret = []byte(secret)
	})
	return tokenSecret
}

// --- Unsubscribe tokens ---

// makeUnsubToken signs an email address so unsubscribe links need no login
// or captcha. Stateless: base64url(email) + "." + base64url(HMAC-SHA256).
func makeUnsubToken(email string) string {
	email = strings.ToLower(strings.TrimSpace(email))
	mac := hmac.New(sha256.New, getTokenSecret())
	mac.Write([]byte(email))
	return base64.RawURLEncoding.EncodeToString([]byte(email)) + "." +
		base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func parseUnsubToken(token string) (string, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return "", false
	}
	emailBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", false
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", false
	}
	email := strings.ToLower(string(emailBytes))
	mac := hmac.New(sha256.New, getTokenSecret())
	mac.Write([]byte(email))
	if !hmac.Equal(sig, mac.Sum(nil)) {
		return "", false
	}
	return email, true
}

func unsubPageURL(email string) string {
	return fmt.Sprintf("%s/newsletter/unsubscribe/?token=%s", siteURL(), makeUnsubToken(email))
}

func oneClickURL(email string) string {
	return fmt.Sprintf("%s/newsletter/unsubscribe/confirm?token=%s", apiPublicURL(), makeUnsubToken(email))
}

// handleNewsletterUnsubscribeConfirm processes token-based unsubscribes.
// It answers both the site confirm page (JSON {"token"}) and RFC 8058
// one-click POSTs from mail clients (token in the query string). GET is
// never allowed to unsubscribe: link scanners prefetch GET URLs.
func handleNewsletterUnsubscribeConfirm(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	ip := clientIP(r)
	if !checkRateLimit("newsletter:" + ip) {
		jsonResponse(w, http.StatusTooManyRequests, map[string]interface{}{
			"success": false,
			"message": "Too many requests. Please try again later.",
		})
		return
	}

	token := r.URL.Query().Get("token")
	if token == "" {
		var req struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)).Decode(&req); err == nil {
			token = req.Token
		}
	}

	email, ok := parseUnsubToken(token)
	if !ok {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid or expired unsubscribe link.",
		})
		return
	}

	// Idempotent: succeed even if the email is not subscribed.
	if _, err := db.Exec("DELETE FROM subscribers WHERE email = ?", email); err != nil {
		fmt.Fprintf(os.Stderr, "Database error: %v\n", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to unsubscribe. Please try again.",
		})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "You have been unsubscribed.",
	})
}

// handleAdminNewsletterConfig exposes the configured sender addresses so
// the admin UI can offer exactly the From addresses this server allows.
func handleAdminNewsletterConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"fromName":      newsletterFromName(),
		"fromAddresses": allowedFromAddresses(),
	})
}

// --- Campaign storage ---

type campaignStats struct {
	Total   int `json:"total"`
	Pending int `json:"pending"`
	Sent    int `json:"sent"`
	Failed  int `json:"failed"`
}

type campaign struct {
	ID           int64         `json:"id"`
	Title        string        `json:"title"`
	Subject      string        `json:"subject"`
	FromEmail    string        `json:"fromEmail"`
	BodyMarkdown string        `json:"bodyMarkdown"`
	Status       string        `json:"status"`
	Source       string        `json:"source"`
	CreatedAt    string        `json:"createdAt"`
	UpdatedAt    string        `json:"updatedAt"`
	StartedAt    *string       `json:"startedAt"`
	FinishedAt   *string       `json:"finishedAt"`
	Stats        campaignStats `json:"stats"`
}

func loadCampaignStats(campaignID int64) campaignStats {
	stats := campaignStats{}
	rows, err := db.Query("SELECT status, COUNT(*) FROM deliveries WHERE campaign_id = ? GROUP BY status", campaignID)
	if err != nil {
		return stats
	}
	defer rows.Close()
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			continue
		}
		switch status {
		case deliveryStatusPending:
			stats.Pending = count
		case deliveryStatusSent:
			stats.Sent = count
		case deliveryStatusFailed:
			stats.Failed = count
		}
		stats.Total += count
	}
	return stats
}

// scanCampaign only scans the row. Stats are loaded separately by callers
// once the row source is done: the pool is capped at one connection, so a
// nested query while rows are still open would deadlock.
func scanCampaign(sc interface{ Scan(...interface{}) error }) (*campaign, error) {
	var c campaign
	var startedAt, finishedAt sql.NullString
	err := sc.Scan(&c.ID, &c.Title, &c.Subject, &c.FromEmail, &c.BodyMarkdown,
		&c.Status, &c.Source, &c.CreatedAt, &c.UpdatedAt, &startedAt, &finishedAt)
	if err != nil {
		return nil, err
	}
	if startedAt.Valid {
		c.StartedAt = &startedAt.String
	}
	if finishedAt.Valid {
		c.FinishedAt = &finishedAt.String
	}
	return &c, nil
}

const campaignColumns = "id, title, subject, from_email, body_markdown, status, source, created_at, updated_at, started_at, finished_at"

func loadCampaign(id int64) (*campaign, error) {
	c, err := scanCampaign(db.QueryRow("SELECT "+campaignColumns+" FROM campaigns WHERE id = ?", id))
	if err != nil {
		return nil, err
	}
	c.Stats = loadCampaignStats(c.ID)
	return c, nil
}

// --- Admin campaign handlers ---

// requireCampaignAccess mirrors requireSurveyAccess: sending and deleting
// campaigns need newsletter-admin; everything else allows newsletter-staff.
func requireCampaignAccess(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		isSend := r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/send")
		if r.Method == http.MethodDelete || isSend {
			requireRole(newsletterAdminRoleName)(next)(w, r)
			return
		}
		requireAnyRole(newsletterAdminRoleName, newsletterStaffRoleName)(next)(w, r)
	}
}

func handleAdminCampaigns(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listCampaigns(w, r)
	case http.MethodPost:
		createCampaign(w, r)
	default:
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func listCampaigns(w http.ResponseWriter, _ *http.Request) {
	rows, err := db.Query("SELECT " + campaignColumns + " FROM campaigns ORDER BY id DESC")
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	campaigns := []campaign{}
	for rows.Next() {
		c, err := scanCampaign(rows)
		if err != nil {
			jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		campaigns = append(campaigns, *c)
	}
	rows.Close()

	// Stats load after the list rows are closed: the pool is capped at one
	// connection, so querying while iterating would deadlock the handler.
	for i := range campaigns {
		campaigns[i].Stats = loadCampaignStats(campaigns[i].ID)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{"campaigns": campaigns})
}

type campaignInput struct {
	Title        string `json:"title"`
	Subject      string `json:"subject"`
	FromEmail    string `json:"fromEmail"`
	BodyMarkdown string `json:"bodyMarkdown"`
}

func decodeCampaignInput(w http.ResponseWriter, r *http.Request) (*campaignInput, string) {
	var req campaignInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)).Decode(&req); err != nil {
		return nil, "Invalid request body"
	}
	req.Title = sanitizeInput(req.Title)
	req.Subject = sanitizeInput(req.Subject)
	req.FromEmail = strings.ToLower(sanitizeInput(req.FromEmail))
	req.BodyMarkdown = sanitizeInput(req.BodyMarkdown)

	if req.Title == "" || len(req.Title) > maxCampaignTitleLen {
		return nil, fmt.Sprintf("Title is required (max %d characters)", maxCampaignTitleLen)
	}
	if req.Subject == "" || len(req.Subject) > maxCampaignSubjectLen {
		return nil, fmt.Sprintf("Subject is required (max %d characters)", maxCampaignSubjectLen)
	}
	if req.BodyMarkdown == "" || len(req.BodyMarkdown) > maxCampaignBodyLen {
		return nil, fmt.Sprintf("Body is required (max %d characters)", maxCampaignBodyLen)
	}
	if !isAllowedFromAddress(req.FromEmail) {
		return nil, "From address is not allowed"
	}
	return &req, ""
}

func createCampaign(w http.ResponseWriter, r *http.Request) {
	req, errMsg := decodeCampaignInput(w, r)
	if req == nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": errMsg})
		return
	}

	res, err := db.Exec(
		"INSERT INTO campaigns (title, subject, from_email, body_markdown, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		req.Title, req.Subject, req.FromEmail, req.BodyMarkdown, campaignStatusDraft, campaignSourceManual,
		time.Now().UTC().Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	id, _ := res.LastInsertId()

	c, err := loadCampaign(id)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	jsonResponse(w, http.StatusCreated, c)
}

// handleAdminCampaignDetail dispatches /admin/newsletter/campaigns/{id}[/send|/test]
// and /admin/newsletter/campaigns/preview.
func handleAdminCampaignDetail(w http.ResponseWriter, r *http.Request) {
	rest := strings.Trim(strings.TrimPrefix(r.URL.Path, "/admin/newsletter/campaigns/"), "/")

	if rest == "preview" && r.Method == http.MethodPost {
		previewCampaign(w, r)
		return
	}

	var idStr, action string
	if idx := strings.Index(rest, "/"); idx >= 0 {
		idStr, action = rest[:idx], rest[idx+1:]
	} else {
		idStr = rest
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Invalid campaign ID"})
		return
	}

	switch {
	case action == "" && r.Method == http.MethodGet:
		getCampaign(w, r, id)
	case action == "" && r.Method == http.MethodPut:
		updateCampaign(w, r, id)
	case action == "" && r.Method == http.MethodDelete:
		deleteCampaign(w, r, id)
	case action == "send" && r.Method == http.MethodPost:
		sendCampaignNow(w, r, id)
	case action == "test" && r.Method == http.MethodPost:
		testCampaign(w, r, id)
	default:
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func getCampaign(w http.ResponseWriter, _ *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		jsonResponse(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	jsonResponse(w, http.StatusOK, c)
}

func updateCampaign(w http.ResponseWriter, r *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		jsonResponse(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	if c.Status != campaignStatusDraft {
		jsonResponse(w, http.StatusConflict, map[string]string{"error": "Only draft campaigns can be edited"})
		return
	}

	req, errMsg := decodeCampaignInput(w, r)
	if req == nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": errMsg})
		return
	}

	if _, err := db.Exec(
		"UPDATE campaigns SET title = ?, subject = ?, from_email = ?, body_markdown = ?, updated_at = ? WHERE id = ?",
		req.Title, req.Subject, req.FromEmail, req.BodyMarkdown, time.Now().UTC().Format(time.RFC3339), id,
	); err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	updated, err := loadCampaign(id)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	jsonResponse(w, http.StatusOK, updated)
}

func deleteCampaign(w http.ResponseWriter, _ *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		jsonResponse(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	if c.Status == campaignStatusSending {
		jsonResponse(w, http.StatusConflict, map[string]string{"error": "Cannot delete a campaign while it is sending"})
		return
	}

	res, err := db.Exec("DELETE FROM campaigns WHERE id = ?", id)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	rows, _ := res.RowsAffected()
	jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}

var errNoSubscribers = errors.New("no subscribers to send to")

// launchCampaign snapshots all current subscribers into deliveries, marks
// the draft campaign as sending, and queues it for the background sender.
// Returns the number of recipients.
func launchCampaign(c *campaign) (int, error) {
	if c.Status != campaignStatusDraft {
		return 0, fmt.Errorf("campaign %d is not a draft", c.ID)
	}

	var subscriberCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM subscribers").Scan(&subscriberCount); err != nil {
		return 0, err
	}
	if subscriberCount == 0 {
		return 0, errNoSubscribers
	}

	if _, err := db.Exec("INSERT OR IGNORE INTO deliveries (campaign_id, email) SELECT ?, email FROM subscribers", c.ID); err != nil {
		return 0, err
	}
	if _, err := db.Exec("UPDATE campaigns SET status = ?, started_at = ?, updated_at = ? WHERE id = ?",
		campaignStatusSending, time.Now().UTC().Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339), c.ID); err != nil {
		return 0, err
	}

	select {
	case campaignQueue <- c.ID:
	default:
		// Queue full; the resume pass on next startup would miss it, so send inline.
		go sendCampaign(c.ID)
	}
	return subscriberCount, nil
}

// sendCampaignNow snapshots all current subscribers into deliveries and
// queues the campaign for the background sender.
func sendCampaignNow(w http.ResponseWriter, _ *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		jsonResponse(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	total, err := launchCampaign(c)
	if err == errNoSubscribers {
		jsonResponse(w, http.StatusConflict, map[string]string{"error": "No subscribers to send to"})
		return
	}
	if err != nil {
		if c.Status != campaignStatusDraft {
			jsonResponse(w, http.StatusConflict, map[string]string{"error": "Campaign has already been sent"})
			return
		}
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"status":  campaignStatusSending,
		"total":   total,
	})
}

// testCampaign sends the campaign to a single address without touching
// subscriber state. The address needs no subscription: the token is an
// HMAC over the email and unsubscribing a non-subscriber is a no-op.
func testCampaign(w http.ResponseWriter, r *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		jsonResponse(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)).Decode(&req); err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	email := strings.ToLower(sanitizeInput(req.Email))
	if !emailRegex.MatchString(email) {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Please enter a valid email address"})
		return
	}

	if err := deliverCampaignEmail(c, email); err != nil {
		jsonResponse(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("Test send failed: %v", err)})
		return
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "message": "Test email sent."})
}

// previewCampaign renders markdown to the inner HTML used in the email
// template, so the admin UI previews exactly what goldmark produces.
func previewCampaign(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BodyMarkdown string `json:"bodyMarkdown"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)).Decode(&req); err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	if len(req.BodyMarkdown) > maxCampaignBodyLen {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "Body too large"})
		return
	}
	htmlBody, err := renderMarkdown(req.BodyMarkdown)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	jsonResponse(w, http.StatusOK, map[string]string{"html": htmlBody})
}

// --- Rendering and delivery ---

func renderMarkdown(markdown string) (string, error) {
	var buf bytes.Buffer
	if err := mdRenderer.Convert([]byte(markdown), &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// buildCampaignHTML wraps rendered markdown in a light, inline-styled
// single-column layout. Keep styles inline: email clients strip <style>.
func buildCampaignHTML(innerHTML, unsubURL string) string {
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background-color:#18181b;border-radius:12px 12px 0 0;padding:20px 32px;">
      <span style="color:#f97316;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;">NukeHub</span>
      <span style="color:#a1a1aa;font-family:Arial,Helvetica,sans-serif;font-size:14px;"> Newsletter</span>
    </div>
    <div style="background-color:#ffffff;padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#27272a;">
      ` + innerHTML + `
    </div>
    <div style="background-color:#fafafa;border-top:1px solid #e4e4e7;border-radius:0 0 12px 12px;padding:20px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#71717a;">
      <p style="margin:0 0 8px 0;">You are receiving this email because you subscribed to the NukeHub newsletter at <a href="` + siteURL() + `" style="color:#f97316;">nukehub.org</a>.</p>
      <p style="margin:0;"><a href="` + unsubURL + `" style="color:#71717a;">Unsubscribe from this newsletter</a></p>
    </div>
  </div>
</body>
</html>`
}

// deliverCampaignEmail renders and sends one campaign email to one address.
func deliverCampaignEmail(c *campaign, email string) error {
	innerHTML, err := renderMarkdown(c.BodyMarkdown)
	if err != nil {
		return fmt.Errorf("render markdown: %w", err)
	}
	htmlBody := buildCampaignHTML(innerHTML, unsubPageURL(email))
	textBody := c.BodyMarkdown + "\n\n---\nUnsubscribe: " + unsubPageURL(email) + "\n"

	return sendBulkEmail(c.FromEmail, newsletterFromName(), email, c.Subject, htmlBody, textBody, oneClickURL(email))
}

// sendBulkEmail sends a multipart email with RFC 8058 one-click
// unsubscribe headers. The SMTP envelope sender stays SMTP_USER; the
// From header carries the campaign address (must be permitted to send as
// it, e.g. a mailcow alias of SMTP_USER).
func sendBulkEmail(fromEmail, fromName, to, subject, htmlBody, textBody, oneClickURL string) error {
	smtpHost := getEnv("SMTP_HOST", "localhost")
	smtpPort := getEnv("SMTP_PORT", "587")
	smtpUser := getEnv("SMTP_USER", "")
	smtpPass := getEnv("SMTP_PASS", "")
	smtpSecure := getEnv("SMTP_SECURE", "false") == "true"

	// RFC 2047-encode the subject when it contains non-ASCII characters.
	encodedSubject := sanitizeHeader(subject)
	for _, r := range subject {
		if r > 127 {
			encodedSubject = mime.QEncoding.Encode("utf-8", sanitizeHeader(subject))
			break
		}
	}

	boundaryBytes := make([]byte, 12)
	if _, err := rand.Read(boundaryBytes); err != nil {
		return fmt.Errorf("generate MIME boundary: %w", err)
	}
	boundary := "nukehub-" + hex.EncodeToString(boundaryBytes)

	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s <%s>\r\n", sanitizeHeader(fromName), sanitizeHeader(fromEmail))
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", encodedSubject)
	fmt.Fprintf(&msg, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&msg, "Content-Type: multipart/alternative; boundary=%s\r\n", boundary)
	fmt.Fprintf(&msg, "List-Unsubscribe: <%s>\r\n", oneClickURL)
	fmt.Fprintf(&msg, "List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n")
	fmt.Fprintf(&msg, "Precedence: bulk\r\n")
	fmt.Fprintf(&msg, "\r\n")
	fmt.Fprintf(&msg, "--%s\r\n", boundary)
	fmt.Fprintf(&msg, "Content-Type: text/plain; charset=utf-8\r\n\r\n")
	fmt.Fprintf(&msg, "%s\r\n", textBody)
	fmt.Fprintf(&msg, "--%s\r\n", boundary)
	fmt.Fprintf(&msg, "Content-Type: text/html; charset=utf-8\r\n\r\n")
	fmt.Fprintf(&msg, "%s\r\n", htmlBody)
	fmt.Fprintf(&msg, "--%s--\r\n", boundary)

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	// Bounces go to the envelope sender, not the From header — use the
	// dedicated bounce mailbox so the watcher can process them.
	envelopeFrom := bounceEnvelopeFrom()

	if smtpSecure {
		tlsConfig := &tls.Config{ServerName: smtpHost}
		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("TLS dial failed: %w", err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, smtpHost)
		if err != nil {
			return fmt.Errorf("SMTP client failed: %w", err)
		}
		defer client.Close()

		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP auth failed: %w", err)
		}
		if err := client.Mail(envelopeFrom); err != nil {
			return fmt.Errorf("SMTP mail failed: %w", err)
		}
		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("SMTP rcpt failed: %w", err)
		}
		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("SMTP data failed: %w", err)
		}
		if _, err := w.Write(msg.Bytes()); err != nil {
			return fmt.Errorf("SMTP write failed: %w", err)
		}
		if err := w.Close(); err != nil {
			return fmt.Errorf("SMTP close failed: %w", err)
		}
		return client.Quit()
	}

	return smtp.SendMail(addr, auth, envelopeFrom, []string{to}, msg.Bytes())
}

// --- Background sender ---

// startCampaignSender launches the worker and re-queues campaigns that
// were interrupted mid-send. Idempotent: only pending deliveries are
// sent, so a restarted campaign never double-sends finished recipients.
func startCampaignSender() {
	go func() {
		for id := range campaignQueue {
			sendCampaign(id)
		}
	}()

	rows, err := db.Query("SELECT id FROM campaigns WHERE status = ?", campaignStatusSending)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to resume campaigns: %v\n", err)
		return
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		campaignQueue <- id
	}
}

func sendCampaign(campaignID int64) {
	c, err := loadCampaign(campaignID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Campaign %d: load failed: %v\n", campaignID, err)
		return
	}

	delay := sendDelay()
	for {
		rows, err := db.Query(
			"SELECT id, email FROM deliveries WHERE campaign_id = ? AND status = ? ORDER BY id LIMIT ?",
			campaignID, deliveryStatusPending, deliveryBatchSize,
		)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Campaign %d: query deliveries failed: %v\n", campaignID, err)
			return
		}
		type delivery struct {
			id    int64
			email string
		}
		var batch []delivery
		for rows.Next() {
			var d delivery
			if err := rows.Scan(&d.id, &d.email); err == nil {
				batch = append(batch, d)
			}
		}
		rows.Close()

		if len(batch) == 0 {
			break
		}

		for _, d := range batch {
			err := deliverCampaignEmail(c, d.email)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Campaign %d: send to %s failed: %v\n", campaignID, d.email, err)
				if _, dbErr := db.Exec("UPDATE deliveries SET status = ?, error = ? WHERE id = ?",
					deliveryStatusFailed, err.Error(), d.id); dbErr != nil {
					fmt.Fprintf(os.Stderr, "Campaign %d: update delivery failed: %v\n", campaignID, dbErr)
				}
			} else {
				if _, dbErr := db.Exec("UPDATE deliveries SET status = ?, sent_at = ? WHERE id = ?",
					deliveryStatusSent, time.Now().UTC().Format(time.RFC3339), d.id); dbErr != nil {
					fmt.Fprintf(os.Stderr, "Campaign %d: update delivery failed: %v\n", campaignID, dbErr)
				}
			}
			time.Sleep(delay)
		}
	}

	if _, err := db.Exec("UPDATE campaigns SET status = ?, finished_at = ?, updated_at = ? WHERE id = ?",
		campaignStatusSent, time.Now().UTC().Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339), campaignID); err != nil {
		fmt.Fprintf(os.Stderr, "Campaign %d: mark sent failed: %v\n", campaignID, err)
	}
	fmt.Printf("Campaign %d finished sending\n", campaignID)
}
