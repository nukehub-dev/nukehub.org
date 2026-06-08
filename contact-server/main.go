package main

import (
	"bytes"
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

	handler := corsMiddleware(mux, allowedOrigins)

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
		Name           string `json:"name"`
		Email          string `json:"email"`
		Organization   string `json:"organization"`
		InquiryType    string `json:"inquiryType"`
		Message        string `json:"message"`
		TurnstileToken string `json:"turnstileToken"`
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
		<p><strong>Message:</strong></p>
		<p style="white-space: pre-wrap">%s</p>
	`, html.EscapeString(safeName), html.EscapeString(safeEmail),
		html.EscapeString(organization), html.EscapeString(inquiryType),
		html.EscapeString(message))

	textBody := fmt.Sprintf("Name: %s\nEmail: %s\nOrganization: %s\nInquiry Type: %s\n\nMessage:\n%s",
		safeName, safeEmail, organization, inquiryType, message)

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

func sendEmail(to, replyTo, subject, htmlBody, textBody string) error {
	smtpHost := getEnv("SMTP_HOST", "localhost")
	smtpPort := getEnv("SMTP_PORT", "587")
	smtpUser := getEnv("SMTP_USER", "")
	smtpPass := getEnv("SMTP_PASS", "")

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
