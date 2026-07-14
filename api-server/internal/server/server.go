// Package server assembles the HTTP mux from the domain packages.
package server

import (
	"net/http"
	"time"

	"nukehub-api/internal/auth"
	"nukehub-api/internal/contact"
	"nukehub-api/internal/httpx"
	"nukehub-api/internal/newsletter"
	"nukehub-api/internal/store"
	"nukehub-api/internal/survey"
)

// NewMux wires every endpoint: /health and /admin/health/db directly, the
// rest via each domain package's Register.
func NewMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	contact.Register(mux)
	survey.Register(mux)
	newsletter.Register(mux)
	mux.HandleFunc("/admin/health/db", auth.RequireAnyRole(auth.SurveyAdminRole, auth.SurveyViewerRole)(handleAdminHealthDB))
	return mux
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}

func handleAdminHealthDB(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}
	if err := store.DB.Ping(); err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, map[string]interface{}{"status": "error", "message": err.Error()})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"status": "ok", "database": "connected"})
}
