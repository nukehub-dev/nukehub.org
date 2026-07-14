// NukeHub API server: receives the static site's contact-form, survey, and
// newsletter-subscription submissions, persists them to SQLite, forwards
// them via SMTP, and sends newsletter campaigns to subscribers. Routing
// lives in internal/server, domain logic in internal/<domain> packages.
package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"nukehub-api/internal/auth"
	"nukehub-api/internal/config"
	"nukehub-api/internal/httpx"
	"nukehub-api/internal/newsletter"
	"nukehub-api/internal/ratelimit"
	"nukehub-api/internal/server"
	"nukehub-api/internal/store"
)

func main() {
	port := config.Getenv("PORT", "3000")
	allowedOrigins := strings.Split(config.Getenv("ALLOWED_ORIGINS", "https://nukehub.org"), ",")

	// Initialize SQLite database
	if err := store.OpenOnce(); err != nil {
		fmt.Fprintf(os.Stderr, "Database initialization failed: %v\n", err)
		os.Exit(1)
	}

	// Initialize Keycloak JWKS for admin token verification
	authURL := strings.TrimSuffix(config.Getenv("AUTH_URL", ""), "/")
	authRealm := config.Getenv("AUTH_REALM", "")
	if authURL != "" && authRealm != "" {
		auth.Default = auth.New(authURL, authRealm)
		if err := auth.Default.Refresh(); err != nil {
			fmt.Fprintf(os.Stderr, "JWKS fetch failed: %v\n", err)
		}
		auth.Default.StartAutoRefresh(10 * time.Minute)
	}

	// Cleanup old rate limit entries
	ratelimit.StartCleanup()

	// Newsletter campaign sender (resumes interrupted sends) and the opt-in
	// blog-RSS and bounce watchers.
	newsletter.StartBackground()

	handler := httpx.SecurityHeaders(httpx.CORS(httpx.ConcurrencyLimit(server.NewMux()), allowedOrigins))

	fmt.Printf("NukeHub API server listening on port %s\n", port)
	fmt.Printf("Health check: http://localhost:%s/health\n", port)
	fmt.Printf("Allowed origins: %s\n", strings.Join(allowedOrigins, ", "))

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}
