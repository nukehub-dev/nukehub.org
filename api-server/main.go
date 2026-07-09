package main

import (
	"bytes"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"math/big"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "modernc.org/sqlite"
)

// Rate limiting
type rateLimitEntry struct {
	count     int
	resetTime time.Time
}

var rateLimitStore = make(map[string]*rateLimitEntry)
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

const (
	rateLimitWindow        = time.Hour
	rateLimitMax           = 5
	statsDistributionLimit = 50
)

// Database and auth globals
var (
	db          *sql.DB
	dbInit      sync.Once
	dbInitErr   error
	adminEmails map[string]struct{}
	jwksCache   *keycloakJWKS
)

func main() {
	port := getEnv("PORT", "3000")
	allowedOrigins := strings.Split(getEnv("ALLOWED_ORIGINS", "https://nukehub.org"), ",")

	// Initialize SQLite database
	dbInit.Do(func() {
		dbInitErr = initDB()
	})
	if dbInitErr != nil {
		fmt.Fprintf(os.Stderr, "Database initialization failed: %v\n", dbInitErr)
		os.Exit(1)
	}

	// Initialize admin authorization
	adminEmails = parseAdminEmails(getEnv("ADMIN_EMAILS", ""))
	if len(adminEmails) > 0 {
		authURL := strings.TrimSuffix(getEnv("AUTH_URL", ""), "/")
		authRealm := getEnv("AUTH_REALM", "")
		if authURL != "" && authRealm != "" {
			jwksCache = newKeycloakJWKS(authURL, authRealm)
			if err := jwksCache.refresh(); err != nil {
				fmt.Fprintf(os.Stderr, "JWKS fetch failed: %v\n", err)
			}
			go jwksCache.autoRefresh(10 * time.Minute)
		}
	}

	// Cleanup old rate limit entries
	go cleanupRateLimits()

	mux := http.NewServeMux()
	mux.HandleFunc("/contact/health", handleHealth)
	mux.HandleFunc("/contact", handleContact)
	mux.HandleFunc("/survey", handleSurvey)

	// Admin endpoints
	mux.HandleFunc("/admin/health/db", requireAdmin(handleAdminHealthDB))
	mux.HandleFunc("/admin/surveys", requireAdmin(handleAdminSurveys))
	mux.HandleFunc("/admin/surveys/", requireAdmin(handleAdminSurveyDetail))

	handler := securityHeadersMiddleware(corsMiddleware(mux, allowedOrigins))

	fmt.Printf("NukeHub API server listening on port %s\n", port)
	fmt.Printf("Health check: http://localhost:%s/contact/health\n", port)
	fmt.Printf("Allowed origins: %s\n", strings.Join(allowedOrigins, ", "))

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}

func initDB() error {
	dbPath := getEnv("DATABASE_PATH", "./data/nukehub.db")
	dir := strings.TrimSuffix(dbPath, "/"+lastSegment(dbPath))
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return fmt.Errorf("create database directory: %w", err)
		}
	}

	var err error
	db, err = sql.Open("sqlite", dbPath+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)")
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	db.SetMaxOpenConns(1)

	if err := db.Ping(); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	schema := `
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_slug TEXT NOT NULL,
    survey_title TEXT NOT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_hash TEXT,
    email TEXT
);

CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    question_id TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submissions_slug ON submissions(survey_slug);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_responses_submission_id ON responses(submission_id);
`
	if _, err := db.Exec(schema); err != nil {
		return fmt.Errorf("create schema: %w", err)
	}
	return nil
}

func lastSegment(path string) string {
	parts := strings.Split(path, "/")
	return parts[len(parts)-1]
}

func parseAdminEmails(raw string) map[string]struct{} {
	result := make(map[string]struct{})
	for _, part := range strings.Split(raw, ",") {
		email := strings.TrimSpace(strings.ToLower(part))
		if emailRegex.MatchString(email) {
			result[email] = struct{}{}
		}
	}
	return result
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}

func handleContact(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	ip := clientIP(r)

	if !checkRateLimit(ip) {
		jsonResponse(w, http.StatusTooManyRequests, map[string]interface{}{
			"success": false,
			"message": "Too many requests. Please try again later.",
		})
		return
	}

	var req struct {
		Name             string            `json:"name"`
		Email            string            `json:"email"`
		Organization     string            `json:"organization"`
		InquiryType      string            `json:"inquiryType"`
		Message          string            `json:"message"`
		TurnstileToken   string            `json:"turnstileToken"`
		AdditionalFields map[string]string `json:"additionalFields"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	// Validation
	name := sanitizeInput(req.Name)
	email := sanitizeInput(req.Email)
	organization := sanitizeInput(req.Organization)
	inquiryType := sanitizeInput(req.InquiryType)
	message := sanitizeInput(req.Message)

	errors := make(map[string]string)

	if len(name) < 2 {
		errors["name"] = "Name must be at least 2 characters"
	}

	if !emailRegex.MatchString(email) {
		errors["email"] = "Please enter a valid email address"
	}

	if inquiryType == "" {
		errors["inquiryType"] = "Please select an inquiry type"
	}

	if len(message) < 10 {
		errors["message"] = "Message must be at least 10 characters"
	}

	if len(message) > 2000 {
		errors["message"] = "Message must be less than 2000 characters"
	}

	// Verify Turnstile
	if req.TurnstileToken == "" {
		errors["turnstile"] = "Please complete the CAPTCHA verification"
	} else {
		if !verifyTurnstile(req.TurnstileToken) {
			errors["turnstile"] = "CAPTCHA verification failed. Please try again."
		}
	}

	if len(errors) > 0 {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"errors":  errors,
		})
		return
	}

	// Build additional fields section
	additionalHTML := ""
	additionalText := ""
	if len(req.AdditionalFields) > 0 {
		additionalHTML += "<h3>Additional Information</h3><ul>"
		for key, value := range req.AdditionalFields {
			safeKey := sanitizeInput(key)
			safeValue := sanitizeInput(value)
			if safeValue == "" {
				continue
			}
			additionalHTML += fmt.Sprintf("<li><strong>%s:</strong> %s</li>",
				html.EscapeString(safeKey), html.EscapeString(safeValue))
			additionalText += fmt.Sprintf("%s: %s\n", safeKey, safeValue)
		}
		additionalHTML += "</ul>"
	}

	// Send email
	toEmail := getEnv("CONTACT_TO_EMAIL", "contact@nukehub.org")
	safeName := sanitizeHeader(name)
	safeEmail := sanitizeHeader(email)

	subject := fmt.Sprintf("[%s] Message from %s", inquiryType, safeName)
	htmlBody := fmt.Sprintf(`
		<h2>New Contact Form Submission</h2>
		<p><strong>Name:</strong> %s</p>
		<p><strong>Email:</strong> %s</p>
		<p><strong>Organization:</strong> %s</p>
		<p><strong>Inquiry Type:</strong> %s</p>
		%s
		<p><strong>Message:</strong></p>
		<p style="white-space: pre-wrap">%s</p>
	`, html.EscapeString(safeName), html.EscapeString(safeEmail),
		html.EscapeString(organization), html.EscapeString(inquiryType),
		additionalHTML, html.EscapeString(message))

	textBody := fmt.Sprintf("Name: %s\nEmail: %s\nOrganization: %s\nInquiry Type: %s\n\n%s\nMessage:\n%s",
		safeName, safeEmail, organization, inquiryType, additionalText, message)

	if err := sendEmail(toEmail, safeEmail, subject, htmlBody, textBody); err != nil {
		fmt.Fprintf(os.Stderr, "SMTP error: %v\n", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to send email. Please try again.",
		})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Thank you for reaching out! We will get back to you soon.",
	})
}

func handleSurvey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	ip := clientIP(r)

	if !checkRateLimit(ip) {
		jsonResponse(w, http.StatusTooManyRequests, map[string]interface{}{
			"success": false,
			"message": "Too many requests. Please try again later.",
		})
		return
	}

	var req struct {
		SurveySlug     string                 `json:"surveySlug"`
		SurveyTitle    string                 `json:"surveyTitle"`
		Responses      map[string]interface{} `json:"responses"`
		TurnstileToken string                 `json:"turnstileToken"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	surveySlug := sanitizeInput(req.SurveySlug)
	surveyTitle := sanitizeInput(req.SurveyTitle)
	if surveySlug == "" {
		surveySlug = "unknown"
	}
	if surveyTitle == "" {
		surveyTitle = "Survey Submission"
	}

	// Verify Turnstile
	if req.TurnstileToken == "" {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "CAPTCHA verification is required",
		})
		return
	}
	if !verifyTurnstile(req.TurnstileToken) {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "CAPTCHA verification failed. Please try again.",
		})
		return
	}

	if len(req.Responses) == 0 {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "No responses provided",
		})
		return
	}

	const maxResponseValueLen = 10000
	const maxArraySelections = 100

	// Normalize and validate responses
	normalized := make(map[string]string)
	for key, value := range req.Responses {
		safeKey := sanitizeInput(key)
		var displayValue string
		switch v := value.(type) {
		case []interface{}:
			if len(v) > maxArraySelections {
				jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
					"success": false,
					"message": fmt.Sprintf("Too many selections for '%s'", safeKey),
				})
				return
			}
			parts := make([]string, 0, len(v))
			for _, item := range v {
				parts = append(parts, sanitizeInput(fmt.Sprintf("%v", item)))
			}
			displayValue = strings.Join(parts, "\n")
		default:
			displayValue = sanitizeInput(fmt.Sprintf("%v", value))
		}

		if len(displayValue) > maxResponseValueLen {
			jsonResponse(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"message": fmt.Sprintf("Response for '%s' exceeds maximum length", safeKey),
			})
			return
		}
		normalized[safeKey] = displayValue
	}

	// Extract respondent email for reply-to and storage
	replyTo := getEnv("SURVEY_TO_EMAIL", getEnv("CONTACT_TO_EMAIL", "contact@nukehub.org"))
	var respondentEmail string
	if emailValue, ok := req.Responses["email"].(string); ok {
		candidate := sanitizeInput(emailValue)
		if candidate != "" && emailRegex.MatchString(candidate) {
			replyTo = candidate
			respondentEmail = candidate
		}
	}

	// Persist to database (storage is source of truth)
	if err := storeSurveySubmission(surveySlug, surveyTitle, hashIP(ip), respondentEmail, normalized); err != nil {
		fmt.Fprintf(os.Stderr, "Database error: %v\n", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to record survey response. Please try again.",
		})
		return
	}

	// Build email body
	htmlItems := ""
	textItems := ""
	for key, value := range normalized {
		htmlItems += fmt.Sprintf("<li><strong>%s:</strong> %s</li>", html.EscapeString(key), html.EscapeString(strings.ReplaceAll(value, "\n", ", ")))
		textItems += fmt.Sprintf("%s: %s\n", key, strings.ReplaceAll(value, "\n", ", "))
	}

	toEmail := getEnv("SURVEY_TO_EMAIL", getEnv("CONTACT_TO_EMAIL", "contact@nukehub.org"))
	subject := fmt.Sprintf("[Survey] %s", surveyTitle)
	htmlBody := fmt.Sprintf(`
		<h2>New Survey Submission</h2>
		<p><strong>Survey:</strong> %s</p>
		<p><strong>Slug:</strong> %s</p>
		<h3>Responses</h3>
		<ul>%s</ul>
	`, html.EscapeString(surveyTitle), html.EscapeString(surveySlug), htmlItems)

	textBody := fmt.Sprintf("Survey: %s\nSlug: %s\n\nResponses:\n%s", surveyTitle, surveySlug, textItems)

	// Email failure is logged but does not fail the user-facing request
	if err := sendEmail(toEmail, replyTo, subject, htmlBody, textBody); err != nil {
		fmt.Fprintf(os.Stderr, "SMTP error: %v\n", err)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Thank you for completing the survey!",
	})
}

func storeSurveySubmission(surveySlug, surveyTitle, ipHash, email string, responses map[string]string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		"INSERT INTO submissions (survey_slug, survey_title, submitted_at, ip_hash, email) VALUES (?, ?, ?, ?, ?)",
		surveySlug, surveyTitle, time.Now().UTC().Format(time.RFC3339), ipHash, email,
	)
	if err != nil {
		return err
	}

	submissionID, err := res.LastInsertId()
	if err != nil {
		return err
	}

	stmt, err := tx.Prepare("INSERT INTO responses (submission_id, question_id, value) VALUES (?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for key, value := range responses {
		if _, err := stmt.Exec(submissionID, key, value); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func clientIP(r *http.Request) string {
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
		if ip != "" {
			ip = strings.Split(ip, ",")[0]
			ip = strings.TrimSpace(ip)
		}
	}
	if ip == "" {
		var err error
		ip, _, err = net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
	}
	return ip
}

func hashIP(ip string) string {
	h := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(h[:])
}

// Admin handlers

func handleAdminHealthDB(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}
	if err := db.Ping(); err != nil {
		jsonResponse(w, http.StatusServiceUnavailable, map[string]interface{}{"status": "error", "message": err.Error()})
		return
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{"status": "ok", "database": "connected"})
}

func handleAdminSurveys(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	rows, err := db.Query(`
		SELECT survey_slug, survey_title, COUNT(*) as count, MAX(submitted_at) as latest
		FROM submissions
		GROUP BY survey_slug, survey_title
		ORDER BY latest DESC
	`)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	type surveySummary struct {
		Slug     string `json:"slug"`
		Title    string `json:"title"`
		Count    int    `json:"count"`
		LatestAt string `json:"latestAt"`
	}
	var surveys []surveySummary
	for rows.Next() {
		var s surveySummary
		if err := rows.Scan(&s.Slug, &s.Title, &s.Count, &s.LatestAt); err != nil {
			jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		surveys = append(surveys, s)
	}
	if surveys == nil {
		surveys = []surveySummary{}
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{"surveys": surveys})
}

func handleAdminSurveyDetail(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/admin/surveys/")
	parts := strings.SplitN(path, "/", 2)
	slug := parts[0]
	if slug == "" {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{"error": "Survey slug is required"})
		return
	}

	action := ""
	if len(parts) > 1 {
		action = parts[1]
	}

	switch r.Method {
	case http.MethodGet:
		switch action {
		case "", "submissions":
			handleAdminSubmissions(w, r, slug)
		case "stats":
			handleAdminStats(w, r, slug)
		case "export.csv":
			handleAdminExportCSV(w, r, slug)
		default:
			jsonResponse(w, http.StatusNotFound, map[string]interface{}{"error": "Unknown endpoint"})
		}
	case http.MethodDelete:
		switch action {
		case "":
			handleDeleteSurveySubmissions(w, r, slug)
		case "submissions":
			handleDeleteSubmissionsBulk(w, r, slug)
		default:
			if strings.HasPrefix(action, "submissions/") {
				idStr := strings.TrimPrefix(action, "submissions/")
				handleDeleteSubmission(w, r, slug, idStr)
				return
			}
			jsonResponse(w, http.StatusNotFound, map[string]interface{}{"error": "Unknown endpoint"})
		}
	default:
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func handleAdminSubmissions(w http.ResponseWriter, r *http.Request, slug string) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 500 {
		limit = 50
	}
	offset := (page - 1) * limit

	var total int
	if err := db.QueryRow("SELECT COUNT(*) FROM submissions WHERE survey_slug = ?", slug).Scan(&total); err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	type submissionWithResponses struct {
		ID          int64             `json:"id"`
		SubmittedAt string            `json:"submittedAt"`
		Email       string            `json:"email"`
		Responses   map[string]string `json:"responses"`
	}

	// Fetch only the submissions for the requested page.
	submissionRows, err := db.Query(`
		SELECT id, submitted_at, email
		FROM submissions
		WHERE survey_slug = ?
		ORDER BY submitted_at DESC
		LIMIT ? OFFSET ?
	`, slug, limit, offset)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer submissionRows.Close()

	paged := make([]*submissionWithResponses, 0, limit)
	var ids []int64
	for submissionRows.Next() {
		var s submissionWithResponses
		if err := submissionRows.Scan(&s.ID, &s.SubmittedAt, &s.Email); err != nil {
			jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		s.Responses = make(map[string]string)
		paged = append(paged, &s)
		ids = append(ids, s.ID)
	}

	if len(ids) > 0 {
		// Build a parameterized IN clause for the paged submission IDs.
		placeholders := make([]string, len(ids))
		args := make([]interface{}, 0, len(ids))
		for i, id := range ids {
			placeholders[i] = "?"
			args = append(args, id)
		}

		responseRows, err := db.Query(fmt.Sprintf(
			"SELECT submission_id, question_id, value FROM responses WHERE submission_id IN (%s)",
			strings.Join(placeholders, ","),
		), args...)
		if err != nil {
			jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		defer responseRows.Close()

		byID := make(map[int64]*submissionWithResponses, len(paged))
		for _, s := range paged {
			byID[s.ID] = s
		}
		for responseRows.Next() {
			var submissionID int64
			var questionID, value string
			if err := responseRows.Scan(&submissionID, &questionID, &value); err != nil {
				jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
				return
			}
			if s, ok := byID[submissionID]; ok {
				s.Responses[questionID] = value
			}
		}
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"slug":        slug,
		"page":        page,
		"limit":       limit,
		"total":       total,
		"submissions": paged,
	})
}

func handleAdminStats(w http.ResponseWriter, r *http.Request, slug string) {
	var total int
	if err := db.QueryRow("SELECT COUNT(*) FROM submissions WHERE survey_slug = ?", slug).Scan(&total); err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	// Daily counts for last 30 days
	rows, err := db.Query(`
		SELECT date(submitted_at) as day, COUNT(*) as count
		FROM submissions
		WHERE survey_slug = ? AND submitted_at >= date('now', '-30 days')
		GROUP BY day
		ORDER BY day ASC
	`, slug)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	daily := make(map[string]int)
	for rows.Next() {
		var day string
		var count int
		if err := rows.Scan(&day, &count); err != nil {
			jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		daily[day] = count
	}

	// Per-question distributions (top N per question to keep responses small)
	rows2, err := db.Query(`
		SELECT question_id, value, count
		FROM (
			SELECT
				r.question_id AS question_id,
				r.value AS value,
				COUNT(*) AS count,
				ROW_NUMBER() OVER (PARTITION BY r.question_id ORDER BY COUNT(*) DESC) AS rank
			FROM responses r
			JOIN submissions s ON s.id = r.submission_id
			WHERE s.survey_slug = ?
			GROUP BY r.question_id, r.value
		)
		WHERE rank <= ?
		ORDER BY question_id, count DESC
	`, slug, statsDistributionLimit)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows2.Close()

	type distribution struct {
		Value string `json:"value"`
		Count int    `json:"count"`
	}
	questionDistributions := make(map[string][]distribution)
	for rows2.Next() {
		var questionID, value string
		var count int
		if err := rows2.Scan(&questionID, &value, &count); err != nil {
			jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		questionDistributions[questionID] = append(questionDistributions[questionID], distribution{Value: value, Count: count})
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"slug":          slug,
		"total":         total,
		"daily":         daily,
		"distributions": questionDistributions,
	})
}

func handleAdminExportCSV(w http.ResponseWriter, r *http.Request, slug string) {
	rows, err := db.Query(`
		SELECT s.id, s.submitted_at, s.email, r.question_id, r.value
		FROM submissions s
		LEFT JOIN responses r ON r.submission_id = s.id
		WHERE s.survey_slug = ?
		ORDER BY s.submitted_at DESC, r.id ASC
	`, slug)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	type submissionWithResponses struct {
		ID          int64
		SubmittedAt string
		Email       string
		Responses   map[string]string
	}

	all := make(map[int64]*submissionWithResponses)
	var order []int64
	questionIDs := make(map[string]struct{})
	for rows.Next() {
		var id int64
		var submittedAt, email, questionID string
		var value sql.NullString
		if err := rows.Scan(&id, &submittedAt, &email, &questionID, &value); err != nil {
			jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		if _, ok := all[id]; !ok {
			all[id] = &submissionWithResponses{
				ID:          id,
				SubmittedAt: submittedAt,
				Email:       email,
				Responses:   make(map[string]string),
			}
			order = append(order, id)
		}
		if value.Valid {
			all[id].Responses[questionID] = value.String
			questionIDs[questionID] = struct{}{}
		}
	}

	headers := []string{"submission_id", "submitted_at", "email"}
	sortedQuestionIDs := make([]string, 0, len(questionIDs))
	for q := range questionIDs {
		sortedQuestionIDs = append(sortedQuestionIDs, q)
	}
	sort.Strings(sortedQuestionIDs)
	headers = append(headers, sortedQuestionIDs...)

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s-export.csv\"", slug))
	cw := csv.NewWriter(w)
	if err := cw.Write(headers); err != nil {
		return
	}

	for _, id := range order {
		s := all[id]
		row := []string{strconv.FormatInt(s.ID, 10), s.SubmittedAt, s.Email}
		for _, q := range sortedQuestionIDs {
			v := s.Responses[q]
			row = append(row, strings.ReplaceAll(v, "\n", "; "))
		}
		if err := cw.Write(row); err != nil {
			return
		}
	}
	cw.Flush()
}

func handleDeleteSubmission(w http.ResponseWriter, r *http.Request, slug, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{"error": "Invalid submission ID"})
		return
	}

	res, err := db.Exec("DELETE FROM submissions WHERE id = ? AND survey_slug = ?", id, slug)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}

func handleDeleteSubmissionsBulk(w http.ResponseWriter, r *http.Request, slug string) {
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{"error": "Invalid request body"})
		return
	}
	if len(req.IDs) == 0 {
		jsonResponse(w, http.StatusBadRequest, map[string]interface{}{"error": "No submission IDs provided"})
		return
	}

	placeholders := make([]string, len(req.IDs))
	args := make([]interface{}, 0, len(req.IDs)+1)
	args = append(args, slug)
	for i, id := range req.IDs {
		placeholders[i] = "?"
		args = append(args, id)
	}

	res, err := db.Exec(fmt.Sprintf(
		"DELETE FROM submissions WHERE survey_slug = ? AND id IN (%s)",
		strings.Join(placeholders, ","),
	), args...)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}

func handleDeleteSurveySubmissions(w http.ResponseWriter, r *http.Request, slug string) {
	res, err := db.Exec("DELETE FROM submissions WHERE survey_slug = ?", slug)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}

func requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if len(adminEmails) == 0 {
			jsonResponse(w, http.StatusForbidden, map[string]interface{}{"error": "Admin access not configured"})
			return
		}
		if jwksCache == nil {
			jsonResponse(w, http.StatusForbidden, map[string]interface{}{"error": "Auth not configured"})
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			jsonResponse(w, http.StatusUnauthorized, map[string]interface{}{"error": "Authorization required"})
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")

		email, err := jwksCache.verifyToken(token)
		if err != nil {
			jsonResponse(w, http.StatusUnauthorized, map[string]interface{}{"error": err.Error()})
			return
		}

		if _, ok := adminEmails[strings.ToLower(email)]; !ok {
			jsonResponse(w, http.StatusForbidden, map[string]interface{}{"error": "Admin access denied"})
			return
		}

		next(w, r)
	}
}

func sendEmail(to, replyTo, subject, htmlBody, textBody string) error {
	smtpHost := getEnv("SMTP_HOST", "localhost")
	smtpPort := getEnv("SMTP_PORT", "587")
	smtpUser := getEnv("SMTP_USER", "")
	smtpPass := getEnv("SMTP_PASS", "")
	smtpSecure := getEnv("SMTP_SECURE", "false") == "true"

	from := fmt.Sprintf("NukeHub <%s>", smtpUser)

	// Build email headers
	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s\r\n", from)
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", subject)
	fmt.Fprintf(&msg, "Reply-To: %s\r\n", replyTo)
	fmt.Fprintf(&msg, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&msg, "Content-Type: multipart/alternative; boundary=boundary123\r\n")
	fmt.Fprintf(&msg, "\r\n")
	fmt.Fprintf(&msg, "--boundary123\r\n")
	fmt.Fprintf(&msg, "Content-Type: text/plain; charset=utf-8\r\n\r\n")
	fmt.Fprintf(&msg, "%s\r\n", textBody)
	fmt.Fprintf(&msg, "--boundary123\r\n")
	fmt.Fprintf(&msg, "Content-Type: text/html; charset=utf-8\r\n\r\n")
	fmt.Fprintf(&msg, "%s\r\n", htmlBody)
	fmt.Fprintf(&msg, "--boundary123--\r\n")

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	if smtpSecure {
		// TLS connection (port 465)
		tlsConfig := &tls.Config{
			ServerName: smtpHost,
		}
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

		if err := client.Mail(smtpUser); err != nil {
			return fmt.Errorf("SMTP mail failed: %w", err)
		}
		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("SMTP rcpt failed: %w", err)
		}

		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("SMTP data failed: %w", err)
		}
		_, err = w.Write(msg.Bytes())
		if err != nil {
			return fmt.Errorf("SMTP write failed: %w", err)
		}
		err = w.Close()
		if err != nil {
			return fmt.Errorf("SMTP close failed: %w", err)
		}

		return client.Quit()
	}

	// STARTTLS connection (port 587)
	return smtp.SendMail(addr, auth, smtpUser, []string{to}, msg.Bytes())
}

func verifyTurnstile(token string) bool {
	secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	if secretKey == "" {
		fmt.Fprintf(os.Stderr, "Turnstile secret key not configured\n")
		return false
	}

	payload, _ := json.Marshal(map[string]string{
		"secret":   secretKey,
		"response": token,
	})

	resp, err := http.Post(
		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		"application/json",
		bytes.NewBuffer(payload),
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Turnstile verification error: %v\n", err)
		return false
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false
	}

	return result.Success
}

func checkRateLimit(ip string) bool {
	now := time.Now()
	entry, exists := rateLimitStore[ip]

	if !exists || now.After(entry.resetTime) {
		rateLimitStore[ip] = &rateLimitEntry{
			count:     1,
			resetTime: now.Add(rateLimitWindow),
		}
		return true
	}

	if entry.count >= rateLimitMax {
		return false
	}

	entry.count++
	return true
}

func cleanupRateLimits() {
	ticker := time.NewTicker(10 * time.Minute)
	for range ticker.C {
		now := time.Now()
		for ip, entry := range rateLimitStore {
			if now.After(entry.resetTime) {
				delete(rateLimitStore, ip)
			}
		}
	}
}

func sanitizeInput(input string) string {
	input = strings.TrimSpace(input)
	input = strings.ReplaceAll(input, "\x00", "")
	// Remove control characters except newline and tab
	var result strings.Builder
	for _, r := range input {
		if (r >= 0x00 && r <= 0x08) || (r >= 0x0B && r <= 0x0C) || (r >= 0x0E && r <= 0x1F) || r == 0x7F {
			continue
		}
		result.WriteRune(r)
	}
	return result.String()
}

func sanitizeHeader(input string) string {
	input = strings.ReplaceAll(input, "\r", "")
	input = strings.ReplaceAll(input, "\n", "")
	return input
}

func corsMiddleware(next http.Handler, allowedOrigins []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Vary", "Origin")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'")
		next.ServeHTTP(w, r)
	})
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Keycloak JWKS verification

type keycloakJWKS struct {
	authURL string
	realm   string
	mu      sync.RWMutex
	keys    map[string]interface{}
}

func newKeycloakJWKS(authURL, realm string) *keycloakJWKS {
	return &keycloakJWKS{
		authURL: authURL,
		realm:   realm,
		keys:    make(map[string]interface{}),
	}
}

func (k *keycloakJWKS) jwksURL() string {
	return fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs", k.authURL, k.realm)
}

func (k *keycloakJWKS) expectedIssuer() string {
	return fmt.Sprintf("%s/realms/%s", k.authURL, k.realm)
}

func (k *keycloakJWKS) autoRefresh(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		if err := k.refresh(); err != nil {
			fmt.Fprintf(os.Stderr, "JWKS refresh failed: %v\n", err)
		}
	}
}

func (k *keycloakJWKS) refresh() error {
	resp, err := http.Get(k.jwksURL())
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned %d", resp.StatusCode)
	}

	var jwks struct {
		Keys []struct {
			Kid string   `json:"kid"`
			Kty string   `json:"kty"`
			Use string   `json:"use"`
			N   string   `json:"n"`
			E   string   `json:"e"`
			X5c []string `json:"x5c"`
			Alg string   `json:"alg"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return err
	}

	newKeys := make(map[string]interface{})
	for _, key := range jwks.Keys {
		if key.Kty != "RSA" || (key.Use != "" && key.Use != "sig") {
			continue
		}
		pubKey, err := parseRSAPublicKey(key.N, key.E)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to parse RSA key %s: %v\n", key.Kid, err)
			continue
		}
		newKeys[key.Kid] = pubKey
	}

	k.mu.Lock()
	k.keys = newKeys
	k.mu.Unlock()
	return nil
}

func (k *keycloakJWKS) getKey(kid string) interface{} {
	k.mu.RLock()
	defer k.mu.RUnlock()
	return k.keys[kid]
}

func (k *keycloakJWKS) verifyToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("token missing kid header")
		}
		key := k.getKey(kid)
		if key == nil {
			return nil, fmt.Errorf("key not found: %s", kid)
		}
		return key, nil
	}, jwt.WithIssuer(k.expectedIssuer()), jwt.WithValidMethods([]string{"RS256"}))
	if err != nil {
		// If key is missing, try refreshing JWKS once
		if strings.Contains(err.Error(), "key not found") {
			if refreshErr := k.refresh(); refreshErr != nil {
				return "", err
			}
			token, err = jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				kid, _ := token.Header["kid"].(string)
				return k.getKey(kid), nil
			}, jwt.WithIssuer(k.expectedIssuer()), jwt.WithValidMethods([]string{"RS256"}))
			if err != nil {
				return "", err
			}
		} else {
			return "", err
		}
	}

	if !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid token claims")
	}

	// Verify azp (authorized party) matches our client if configured
	authClientID := getEnv("AUTH_CLIENT_ID", "")
	if authClientID != "" {
		azp, _ := claims["azp"].(string)
		if azp != "" && subtle.ConstantTimeCompare([]byte(azp), []byte(authClientID)) != 1 {
			return "", fmt.Errorf("unauthorized client")
		}
	}

	email, _ := claims["email"].(string)
	if email == "" {
		return "", fmt.Errorf("token missing email claim")
	}
	return email, nil
}

func parseRSAPublicKey(nB64, eB64 string) (interface{}, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nB64)
	if err != nil {
		return nil, fmt.Errorf("decode modulus: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eB64)
	if err != nil {
		return nil, fmt.Errorf("decode exponent: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := int(new(big.Int).SetBytes(eBytes).Int64())
	return &rsa.PublicKey{N: n, E: e}, nil
}
