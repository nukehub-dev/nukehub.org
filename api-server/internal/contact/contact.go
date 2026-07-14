// Package contact implements POST /contact: the static site's contact form
// endpoint. Turnstile-verified, rate limited, forwarded via SMTP.
package contact

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"os"

	"nukehub-api/internal/config"
	"nukehub-api/internal/httpx"
	"nukehub-api/internal/mail"
	"nukehub-api/internal/ratelimit"
	"nukehub-api/internal/turnstile"
)

// Register wires the contact endpoint into the mux.
func Register(mux *http.ServeMux) {
	mux.HandleFunc("/contact", handleContact)
}

func handleContact(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	ip := ratelimit.ClientIP(r)

	if !ratelimit.Allow("contact:" + ip) {
		httpx.JSON(w, http.StatusTooManyRequests, map[string]interface{}{
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

	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	// Validation
	name := httpx.SanitizeInput(req.Name)
	email := httpx.SanitizeInput(req.Email)
	organization := httpx.SanitizeInput(req.Organization)
	inquiryType := httpx.SanitizeInput(req.InquiryType)
	message := httpx.SanitizeInput(req.Message)

	errors := make(map[string]string)

	if len(name) < 2 {
		errors["name"] = "Name must be at least 2 characters"
	}

	if !httpx.EmailRegex.MatchString(email) {
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
		if !turnstile.Verify(req.TurnstileToken, ip) {
			errors["turnstile"] = "CAPTCHA verification failed. Please try again."
		}
	}

	if len(errors) > 0 {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
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
			safeKey := httpx.SanitizeInput(key)
			safeValue := httpx.SanitizeInput(value)
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
	toEmail := config.Getenv("CONTACT_TO_EMAIL", "contact@nukehub.org")
	safeName := httpx.SanitizeHeader(name)
	safeEmail := httpx.SanitizeHeader(email)

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

	if err := mail.Send(toEmail, safeEmail, subject, htmlBody, textBody); err != nil {
		fmt.Fprintf(os.Stderr, "SMTP error: %v\n", err)
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to send email. Please try again.",
		})
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Thank you for reaching out! We will get back to you soon.",
	})
}
