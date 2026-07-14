// Package newsletter implements the newsletter domain: public
// subscribe/unsubscribe endpoints, token-based (RFC 8058) unsubscribe
// confirmation, subscriber admin, campaigns (CRUD/send/test/preview), the
// background sender worker, and the opt-in blog-RSS and bounce watchers.
package newsletter

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"nukehub-api/internal/auth"
	"nukehub-api/internal/httpx"
	"nukehub-api/internal/ratelimit"
	"nukehub-api/internal/store"
	"nukehub-api/internal/turnstile"
)

// Register wires the public subscription endpoints and the newsletter admin
// endpoints into the mux.
func Register(mux *http.ServeMux) {
	mux.HandleFunc("/newsletter", handleNewsletter)
	mux.HandleFunc("/newsletter/unsubscribe", handleNewsletterUnsubscribe)
	mux.HandleFunc("/newsletter/unsubscribe/confirm", handleNewsletterUnsubscribeConfirm)

	mux.HandleFunc("/admin/newsletter/subscribers", auth.RequireAnyRole(auth.NewsletterAdminRole, auth.NewsletterStaffRole)(handleAdminNewsletterSubscribers))
	mux.HandleFunc("/admin/newsletter/subscribers/export.csv", auth.RequireAnyRole(auth.NewsletterAdminRole, auth.NewsletterStaffRole)(handleAdminNewsletterExportCSV))
	mux.HandleFunc("/admin/newsletter/subscribers/", auth.RequireAnyRole(auth.NewsletterAdminRole, auth.NewsletterStaffRole)(handleAdminNewsletterSubscriberDetail))
	mux.HandleFunc("/admin/newsletter/stats", auth.RequireAnyRole(auth.NewsletterAdminRole, auth.NewsletterStaffRole)(handleAdminNewsletterStats))
	mux.HandleFunc("/admin/newsletter/campaigns", auth.RequireAnyRole(auth.NewsletterAdminRole, auth.NewsletterStaffRole)(handleAdminCampaigns))
	mux.HandleFunc("/admin/newsletter/campaigns/", requireCampaignAccess(handleAdminCampaignDetail))
	mux.HandleFunc("/admin/newsletter/config", auth.RequireAnyRole(auth.NewsletterAdminRole, auth.NewsletterStaffRole)(handleAdminNewsletterConfig))
}

// StartBackground launches the campaign sender worker (resuming interrupted
// sends) and the opt-in blog-RSS and bounce watchers.
func StartBackground() {
	getTokenSecret()
	startCampaignSender()

	// Blog RSS → newsletter auto-send (only when BLOG_AUTO_SEND=true)
	startBlogWatcher()

	// Bounce mailbox processing (only when BOUNCE_CHECK_ENABLED=true)
	startBounceWatcher()
}

func handleNewsletter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	ip := ratelimit.ClientIP(r)

	if !ratelimit.Allow("newsletter:" + ip) {
		httpx.JSON(w, http.StatusTooManyRequests, map[string]interface{}{
			"success": false,
			"message": "Too many requests. Please try again later.",
		})
		return
	}

	var req struct {
		Email          string `json:"email"`
		TurnstileToken string `json:"turnstileToken"`
		Source         string `json:"source"`
	}

	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	email := strings.ToLower(httpx.SanitizeInput(req.Email))
	if !httpx.EmailRegex.MatchString(email) {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"errors":  map[string]string{"email": "Please enter a valid email address"},
		})
		return
	}

	if req.TurnstileToken == "" {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"errors":  map[string]string{"turnstile": "Please complete the CAPTCHA verification"},
		})
		return
	}
	if !turnstile.Verify(req.TurnstileToken, ip) {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"errors":  map[string]string{"turnstile": "CAPTCHA verification failed. Please try again."},
		})
		return
	}

	source := httpx.NormalizeSource(req.Source)

	if err := storeNewsletterSubscriber(email, ratelimit.HashIP(ip), source); err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			httpx.JSON(w, http.StatusConflict, map[string]interface{}{
				"success": false,
				"message": "This email is already subscribed.",
			})
			return
		}
		fmt.Fprintf(os.Stderr, "Database error: %v\n", err)
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to subscribe. Please try again.",
		})
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Thanks for subscribing!",
	})
}

func handleNewsletterUnsubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	ip := ratelimit.ClientIP(r)

	if !ratelimit.Allow("newsletter:" + ip) {
		httpx.JSON(w, http.StatusTooManyRequests, map[string]interface{}{
			"success": false,
			"message": "Too many requests. Please try again later.",
		})
		return
	}

	var req struct {
		Email          string `json:"email"`
		TurnstileToken string `json:"turnstileToken"`
	}

	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	email := strings.ToLower(httpx.SanitizeInput(req.Email))
	if !httpx.EmailRegex.MatchString(email) {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"errors":  map[string]string{"email": "Please enter a valid email address"},
		})
		return
	}

	if req.TurnstileToken == "" {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"errors":  map[string]string{"turnstile": "Please complete the CAPTCHA verification"},
		})
		return
	}
	if !turnstile.Verify(req.TurnstileToken, ip) {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"errors":  map[string]string{"turnstile": "CAPTCHA verification failed. Please try again."},
		})
		return
	}

	if _, err := store.DB.Exec("DELETE FROM subscribers WHERE email = ?", email); err != nil {
		fmt.Fprintf(os.Stderr, "Database error: %v\n", err)
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Failed to unsubscribe. Please try again.",
		})
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "You have been unsubscribed.",
	})
}

func storeNewsletterSubscriber(email, ipHash, source string) error {
	_, err := store.DB.Exec(
		"INSERT INTO subscribers (email, subscribed_at, ip_hash, source) VALUES (?, ?, ?, ?)",
		email, time.Now().UTC().Format(time.RFC3339), ipHash, source,
	)
	return err
}
