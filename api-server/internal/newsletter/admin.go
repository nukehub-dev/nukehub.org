package newsletter

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"strings"

	"nukehub-api/internal/httpx"
	"nukehub-api/internal/store"
)

// handleAdminNewsletterConfig exposes the configured sender addresses so
// the admin UI can offer exactly the From addresses this server allows.
func handleAdminNewsletterConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"fromName":      newsletterFromName(),
		"fromAddresses": allowedFromAddresses(),
	})
}

func handleAdminNewsletterSubscribers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

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
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM subscribers").Scan(&total); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, err := store.DB.Query(`
		SELECT id, email, subscribed_at, source
		FROM subscribers
		ORDER BY subscribed_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	type subscriber struct {
		ID           int64  `json:"id"`
		Email        string `json:"email"`
		SubscribedAt string `json:"subscribedAt"`
		Source       string `json:"source"`
	}

	var subscribers []subscriber
	for rows.Next() {
		var s subscriber
		if err := rows.Scan(&s.ID, &s.Email, &s.SubscribedAt, &s.Source); err != nil {
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		subscribers = append(subscribers, s)
	}
	if subscribers == nil {
		subscribers = []subscriber{}
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"page":        page,
		"limit":       limit,
		"total":       total,
		"subscribers": subscribers,
	})
}

func handleAdminNewsletterExportCSV(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	rows, err := store.DB.Query(`
		SELECT email, subscribed_at, source
		FROM subscribers
		ORDER BY subscribed_at DESC
	`)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=\"newsletter-subscribers.csv\"")
	cw := csv.NewWriter(w)
	if err := cw.Write([]string{"email", "subscribed_at", "source"}); err != nil {
		return
	}

	for rows.Next() {
		var email, subscribedAt, source string
		if err := rows.Scan(&email, &subscribedAt, &source); err != nil {
			return
		}
		if err := cw.Write([]string{email, subscribedAt, source}); err != nil {
			return
		}
	}
	cw.Flush()
}

func handleAdminNewsletterSubscriberDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/admin/newsletter/subscribers/")
	idStr := strings.TrimSpace(path)
	if idStr == "" {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Subscriber ID is required"})
		return
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Invalid subscriber ID"})
		return
	}

	res, err := store.DB.Exec("DELETE FROM subscribers WHERE id = ?", id)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}
