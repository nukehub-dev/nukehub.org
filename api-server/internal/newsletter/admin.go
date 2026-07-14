package newsletter

import (
	"encoding/csv"
	"encoding/json"
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
	switch r.Method {
	case http.MethodGet:
		listAdminNewsletterSubscribers(w, r)
	case http.MethodDelete:
		bulkDeleteNewsletterSubscribers(w, r)
	default:
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

// escapeLike neutralizes LIKE wildcards so the search box matches literally.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

func listAdminNewsletterSubscribers(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 500 {
		limit = 50
	}
	offset := (page - 1) * limit

	// Optional filters: case-insensitive email substring and exact source.
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	if len(q) > 100 {
		q = q[:100]
	}
	source := strings.TrimSpace(r.URL.Query().Get("source"))

	where := ""
	args := []interface{}{}
	if q != "" {
		where += " AND email LIKE ? ESCAPE '\\'"
		args = append(args, "%"+escapeLike(q)+"%")
	}
	if source != "" {
		where += " AND source = ?"
		args = append(args, source)
	}

	var total int
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM subscribers WHERE 1=1"+where, args...).Scan(&total); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, err := store.DB.Query(`
		SELECT id, email, subscribed_at, source
		FROM subscribers
		WHERE 1=1`+where+`
		ORDER BY subscribed_at DESC
		LIMIT ? OFFSET ?
	`, append(args, limit, offset)...)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

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
			rows.Close()
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		subscribers = append(subscribers, s)
	}
	rows.Close()
	if subscribers == nil {
		subscribers = []subscriber{}
	}

	// The distinct source list drives the filter dropdown and is intentionally
	// unfiltered so its options stay stable while filtering.
	sources := []string{}
	srcRows, err := store.DB.Query("SELECT DISTINCT source FROM subscribers WHERE source IS NOT NULL AND source <> '' ORDER BY source")
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	for srcRows.Next() {
		var s string
		if err := srcRows.Scan(&s); err == nil {
			sources = append(sources, s)
		}
	}
	srcRows.Close()

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"page":        page,
		"limit":       limit,
		"total":       total,
		"subscribers": subscribers,
		"sources":     sources,
	})
}

// bulkDeleteNewsletterSubscribers removes up to 1000 subscribers by ID.
// Body: {"ids": [1, 2, 3]}.
func bulkDeleteNewsletterSubscribers(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, httpx.MaxRequestBodyBytes)).Decode(&req); err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	if len(req.IDs) == 0 || len(req.IDs) > 1000 {
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": "ids must contain 1-1000 entries"})
		return
	}

	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(req.IDs)), ",")
	args := make([]interface{}, len(req.IDs))
	for i, id := range req.IDs {
		args[i] = id
	}
	res, err := store.DB.Exec("DELETE FROM subscribers WHERE id IN ("+placeholders+")", args...)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
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

// handleAdminNewsletterStats returns aggregate newsletter metrics: signup
// counts per day (last 90 days), per-source counts, and campaign/delivery
// totals. Powers the Statistics tab in the admin dashboard.
func handleAdminNewsletterStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var total int
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM subscribers").Scan(&total); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	daily := make(map[string]int)
	rows, err := store.DB.Query(`
		SELECT DATE(subscribed_at) AS day, COUNT(*)
		FROM subscribers
		WHERE subscribed_at >= DATE('now', '-90 days')
		GROUP BY day
		ORDER BY day ASC
	`)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	for rows.Next() {
		var day string
		var count int
		if err := rows.Scan(&day, &count); err != nil {
			rows.Close()
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		daily[day] = count
	}
	rows.Close()

	type sourceCount struct {
		Value string `json:"value"`
		Count int    `json:"count"`
	}
	sources := []sourceCount{}
	srcRows, err := store.DB.Query(`
		SELECT COALESCE(NULLIF(source, ''), 'newsletter') AS src, COUNT(*)
		FROM subscribers
		GROUP BY src
		ORDER BY COUNT(*) DESC, src ASC
	`)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	for srcRows.Next() {
		var s sourceCount
		if err := srcRows.Scan(&s.Value, &s.Count); err == nil {
			sources = append(sources, s)
		}
	}
	srcRows.Close()

	var campaignTotal, campaignDraft, campaignSending, campaignSent int
	if err := store.DB.QueryRow(`
		SELECT COUNT(*),
			COALESCE(SUM(status = 'draft'), 0),
			COALESCE(SUM(status = 'sending'), 0),
			COALESCE(SUM(status = 'sent'), 0)
		FROM campaigns
	`).Scan(&campaignTotal, &campaignDraft, &campaignSending, &campaignSent); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	var deliveryTotal, deliverySent, deliveryFailed int
	if err := store.DB.QueryRow(`
		SELECT COUNT(*),
			COALESCE(SUM(status = 'sent'), 0),
			COALESCE(SUM(status = 'failed'), 0)
		FROM deliveries
	`).Scan(&deliveryTotal, &deliverySent, &deliveryFailed); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"total":   total,
		"daily":   daily,
		"sources": sources,
		"campaigns": map[string]int{
			"total":   campaignTotal,
			"draft":   campaignDraft,
			"sending": campaignSending,
			"sent":    campaignSent,
		},
		"deliveries": map[string]int{
			"total":  deliveryTotal,
			"sent":   deliverySent,
			"failed": deliveryFailed,
		},
	})
}
