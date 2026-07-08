package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"html"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"regexp"
	"strings"
	"time"
)

// Rate limiting
type rateLimitEntry struct {
	count     int
	resetTime time.Time
}

var rateLimitStore = make(map[string]*rateLimitEntry)
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

const (
	rateLimitWindow = time.Hour
	rateLimitMax    = 5
)

func main() {
	port := getEnv("PORT", "3000")
	allowedOrigins := strings.Split(getEnv("ALLOWED_ORIGINS", "https://nukehub.org"), ",")

	// Cleanup old rate limit entries
	go cleanupRateLimits()

	mux := http.NewServeMux()
	mux.HandleFunc("/contact/health", handleHealth)
	mux.HandleFunc("/contact", handleContact)
	mux.HandleFunc("/survey", handleSurvey)

	handler := securityHeadersMiddleware(corsMiddleware(mux, allowedOrigins))

	fmt.Printf("Contact server listening on port %s\n", port)
	fmt.Printf("Health check: http://localhost:%s/health\n", port)
	fmt.Printf("Allowed origins: %s\n", strings.Join(allowedOrigins, ", "))

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
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

	// Rate limiting — use X-Forwarded-For if behind proxy, else RemoteAddr
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
		if ip != "" {
			// X-Forwarded-For can contain multiple IPs; use the first (client)
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

	// Build email body
	htmlItems := ""
	textItems := ""
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
			displayValue = strings.Join(parts, ", ")
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

		htmlItems += fmt.Sprintf("<li><strong>%s:</strong> %s</li>", html.EscapeString(safeKey), html.EscapeString(displayValue))
		textItems += fmt.Sprintf("%s: %s\n", safeKey, displayValue)
	}

	toEmail := getEnv("SURVEY_TO_EMAIL", getEnv("CONTACT_TO_EMAIL", "contact@nukehub.org"))
	replyTo := toEmail
	if emailValue, ok := req.Responses["email"].(string); ok {
		candidate := sanitizeInput(emailValue)
		if candidate != "" && emailRegex.MatchString(candidate) {
			replyTo = candidate
		}
	}

	subject := fmt.Sprintf("[Survey] %s", surveyTitle)
	htmlBody := fmt.Sprintf(`
		<h2>New Survey Submission</h2>
		<p><strong>Survey:</strong> %s</p>
		<p><strong>Slug:</strong> %s</p>
		<h3>Responses</h3>
		<ul>%s</ul>
	`, html.EscapeString(surveyTitle), html.EscapeString(surveySlug), htmlItems)

	textBody := fmt.Sprintf("Survey: %s\nSlug: %s\n\nResponses:\n%s", surveyTitle, surveySlug, textItems)

	if err := sendEmail(toEmail, replyTo, subject, htmlBody, textBody); err != nil {
		fmt.Fprintf(os.Stderr, "SMTP error: %v\n", err)
		jsonResponse(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to send survey. Please try again.",
		})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Thank you for completing the survey!",
	})
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

		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
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
