package newsletter

// Newsletter campaigns: draft → sending → sent. Admins compose markdown,
// the sender worker fans out per-recipient emails with HMAC-signed
// one-click unsubscribe links (RFC 8058).

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/yuin/goldmark"

	"nukehub-api/internal/auth"
	"nukehub-api/internal/config"
	"nukehub-api/internal/httpx"
	"nukehub-api/internal/store"
)

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
)

var mdRenderer = goldmark.New()

// --- Configuration helpers ---

func newsletterFromEmail() string {
	return config.Getenv("NEWSLETTER_FROM_EMAIL", "news@nukehub.org")
}

func blogFromEmail() string {
	return config.Getenv("BLOG_FROM_EMAIL", "blog@nukehub.org")
}

func newsletterFromName() string {
	return config.Getenv("NEWSLETTER_FROM_NAME", "NukeHub")
}

func siteURL() string {
	return strings.TrimSuffix(config.Getenv("SITE_URL", "https://nukehub.org"), "/")
}

func apiPublicURL() string {
	return strings.TrimSuffix(config.Getenv("API_PUBLIC_URL", "https://api.nukehub.org"), "/")
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
	rows, err := store.DB.Query("SELECT status, COUNT(*) FROM deliveries WHERE campaign_id = ? GROUP BY status", campaignID)
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
	c, err := scanCampaign(store.DB.QueryRow("SELECT "+campaignColumns+" FROM campaigns WHERE id = ?", id))
	if err != nil {
		return nil, err
	}
	c.Stats = loadCampaignStats(c.ID)
	return c, nil
}

// --- Admin campaign handlers ---

// requireCampaignAccess mirrors the survey access gate: sending and deleting
// campaigns need newsletter-admin; everything else allows newsletter-staff.
func requireCampaignAccess(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		isSend := r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/send")
		if r.Method == http.MethodDelete || isSend {
			auth.RequireRole(auth.NewsletterAdminRole)(next)(w, r)
			return
		}
		auth.RequireAnyRole(auth.NewsletterAdminRole, auth.NewsletterStaffRole)(next)(w, r)
	}
}

func handleAdminCampaigns(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listCampaigns(w, r)
	case http.MethodPost:
		createCampaign(w, r)
	default:
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func listCampaigns(w http.ResponseWriter, _ *http.Request) {
	rows, err := store.DB.Query("SELECT " + campaignColumns + " FROM campaigns ORDER BY id DESC")
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	campaigns := []campaign{}
	for rows.Next() {
		c, err := scanCampaign(rows)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
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

	httpx.JSON(w, http.StatusOK, map[string]interface{}{"campaigns": campaigns})
}

type campaignInput struct {
	Title        string `json:"title"`
	Subject      string `json:"subject"`
	FromEmail    string `json:"fromEmail"`
	BodyMarkdown string `json:"bodyMarkdown"`
}

func decodeCampaignInput(w http.ResponseWriter, r *http.Request) (*campaignInput, string) {
	var req campaignInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err != nil {
		return nil, "Invalid request body"
	}
	req.Title = httpx.SanitizeInput(req.Title)
	req.Subject = httpx.SanitizeInput(req.Subject)
	req.FromEmail = strings.ToLower(httpx.SanitizeInput(req.FromEmail))
	req.BodyMarkdown = httpx.SanitizeInput(req.BodyMarkdown)

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
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": errMsg})
		return
	}

	res, err := store.DB.Exec(
		"INSERT INTO campaigns (title, subject, from_email, body_markdown, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		req.Title, req.Subject, req.FromEmail, req.BodyMarkdown, campaignStatusDraft, campaignSourceManual,
		time.Now().UTC().Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	id, _ := res.LastInsertId()

	c, err := loadCampaign(id)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	httpx.JSON(w, http.StatusCreated, c)
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
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid campaign ID"})
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
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func getCampaign(w http.ResponseWriter, _ *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		httpx.JSON(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	httpx.JSON(w, http.StatusOK, c)
}

func updateCampaign(w http.ResponseWriter, r *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		httpx.JSON(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	if c.Status != campaignStatusDraft {
		httpx.JSON(w, http.StatusConflict, map[string]string{"error": "Only draft campaigns can be edited"})
		return
	}

	req, errMsg := decodeCampaignInput(w, r)
	if req == nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": errMsg})
		return
	}

	if _, err := store.DB.Exec(
		"UPDATE campaigns SET title = ?, subject = ?, from_email = ?, body_markdown = ?, updated_at = ? WHERE id = ?",
		req.Title, req.Subject, req.FromEmail, req.BodyMarkdown, time.Now().UTC().Format(time.RFC3339), id,
	); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	updated, err := loadCampaign(id)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	httpx.JSON(w, http.StatusOK, updated)
}

func deleteCampaign(w http.ResponseWriter, _ *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		httpx.JSON(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	if c.Status == campaignStatusSending {
		httpx.JSON(w, http.StatusConflict, map[string]string{"error": "Cannot delete a campaign while it is sending"})
		return
	}

	res, err := store.DB.Exec("DELETE FROM campaigns WHERE id = ?", id)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	rows, _ := res.RowsAffected()
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}

// sendCampaignNow snapshots all current subscribers into deliveries and
// queues the campaign for the background sender.
func sendCampaignNow(w http.ResponseWriter, _ *http.Request, id int64) {
	c, err := loadCampaign(id)
	if err == sql.ErrNoRows {
		httpx.JSON(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	total, err := launchCampaign(c)
	if err == errNoSubscribers {
		httpx.JSON(w, http.StatusConflict, map[string]string{"error": "No subscribers to send to"})
		return
	}
	if err != nil {
		if c.Status != campaignStatusDraft {
			httpx.JSON(w, http.StatusConflict, map[string]string{"error": "Campaign has already been sent"})
			return
		}
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
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
		httpx.JSON(w, http.StatusNotFound, map[string]string{"error": "Campaign not found"})
		return
	}
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	email := strings.ToLower(httpx.SanitizeInput(req.Email))
	if !httpx.EmailRegex.MatchString(email) {
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": "Please enter a valid email address"})
		return
	}

	if err := deliverCampaignEmail(c, email); err != nil {
		httpx.JSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("Test send failed: %v", err)})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "Test email sent."})
}

// previewCampaign renders markdown to the inner HTML used in the email
// template, so the admin UI previews exactly what goldmark produces.
func previewCampaign(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BodyMarkdown string `json:"bodyMarkdown"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	if len(req.BodyMarkdown) > maxCampaignBodyLen {
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": "Body too large"})
		return
	}
	htmlBody, err := renderMarkdown(req.BodyMarkdown)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"html": htmlBody})
}

// --- Rendering ---

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
