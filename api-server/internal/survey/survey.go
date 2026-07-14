// Package survey implements POST /survey (Turnstile-verified submissions
// persisted to SQLite and forwarded via SMTP) and the /admin/surveys
// endpoints for browsing, stats, CSV export, and deletion.
package survey

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"os"
	"strings"
	"time"

	"nukehub-api/internal/auth"
	"nukehub-api/internal/config"
	"nukehub-api/internal/httpx"
	"nukehub-api/internal/mail"
	"nukehub-api/internal/ratelimit"
	"nukehub-api/internal/store"
	"nukehub-api/internal/turnstile"
)

// Register wires the survey submission and admin endpoints into the mux.
func Register(mux *http.ServeMux) {
	mux.HandleFunc("/survey", handleSurvey)
	mux.HandleFunc("/admin/surveys", auth.RequireAnyRole(auth.SurveyAdminRole, auth.SurveyViewerRole)(handleAdminSurveys))
	mux.HandleFunc("/admin/surveys/", requireSurveyAccess(handleAdminSurveyDetail))
}

func handleSurvey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	ip := ratelimit.ClientIP(r)

	if !ratelimit.Allow("survey:" + ip) {
		httpx.JSON(w, http.StatusTooManyRequests, map[string]interface{}{
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

	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	surveySlug := httpx.SanitizeInput(req.SurveySlug)
	surveyTitle := httpx.SanitizeInput(req.SurveyTitle)
	if surveySlug == "" {
		surveySlug = "unknown"
	}
	if surveyTitle == "" {
		surveyTitle = "Survey Submission"
	}

	// Verify Turnstile
	if req.TurnstileToken == "" {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "CAPTCHA verification is required",
		})
		return
	}
	if !turnstile.Verify(req.TurnstileToken, ip) {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "CAPTCHA verification failed. Please try again.",
		})
		return
	}

	if len(req.Responses) == 0 {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
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
		safeKey := httpx.SanitizeInput(key)
		var displayValue string
		switch v := value.(type) {
		case []interface{}:
			if len(v) > maxArraySelections {
				httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
					"success": false,
					"message": fmt.Sprintf("Too many selections for '%s'", safeKey),
				})
				return
			}
			parts := make([]string, 0, len(v))
			for _, item := range v {
				parts = append(parts, httpx.SanitizeInput(fmt.Sprintf("%v", item)))
			}
			displayValue = strings.Join(parts, "\n")
		default:
			displayValue = httpx.SanitizeInput(fmt.Sprintf("%v", value))
		}

		if len(displayValue) > maxResponseValueLen {
			httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"message": fmt.Sprintf("Response for '%s' exceeds maximum length", safeKey),
			})
			return
		}
		normalized[safeKey] = displayValue
	}

	// Extract respondent email for reply-to and storage
	replyTo := config.Getenv("SURVEY_TO_EMAIL", config.Getenv("CONTACT_TO_EMAIL", "contact@nukehub.org"))
	var respondentEmail string
	if emailValue, ok := req.Responses["email"].(string); ok {
		candidate := httpx.SanitizeInput(emailValue)
		if candidate != "" && httpx.EmailRegex.MatchString(candidate) {
			replyTo = candidate
			respondentEmail = candidate
		}
	}

	// Persist to database (storage is source of truth)
	if err := storeSurveySubmission(surveySlug, surveyTitle, ratelimit.HashIP(ip), respondentEmail, normalized); err != nil {
		fmt.Fprintf(os.Stderr, "Database error: %v\n", err)
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{
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

	toEmail := config.Getenv("SURVEY_TO_EMAIL", config.Getenv("CONTACT_TO_EMAIL", "contact@nukehub.org"))
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
	if err := mail.Send(toEmail, replyTo, subject, htmlBody, textBody); err != nil {
		fmt.Fprintf(os.Stderr, "SMTP error: %v\n", err)
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Thank you for completing the survey!",
	})
}

func storeSurveySubmission(surveySlug, surveyTitle, ipHash, email string, responses map[string]string) error {
	tx, err := store.DB.Begin()
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
