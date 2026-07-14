package newsletter

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"

	"nukehub-api/internal/httpx"
	"nukehub-api/internal/ratelimit"
	"nukehub-api/internal/store"
)

var (
	tokenSecret     []byte
	tokenSecretOnce sync.Once
)

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

	token := r.URL.Query().Get("token")
	if token == "" {
		var req struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err == nil {
			token = req.Token
		}
	}

	email, ok := parseUnsubToken(token)
	if !ok {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid or expired unsubscribe link.",
		})
		return
	}

	// Idempotent: succeed even if the email is not subscribed.
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
