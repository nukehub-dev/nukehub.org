package survey

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"nukehub-api/internal/auth"
	"nukehub-api/internal/httpx"
	"nukehub-api/internal/store"
)

const statsDistributionLimit = 50

// requireSurveyAccess allows read-only access to survey-viewer but restricts
// DELETE to survey-admin.
func requireSurveyAccess(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			auth.RequireRole(auth.SurveyAdminRole)(next)(w, r)
			return
		}
		auth.RequireAnyRole(auth.SurveyAdminRole, auth.SurveyViewerRole)(next)(w, r)
	}
}

func handleAdminSurveys(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	rows, err := store.DB.Query(`
		SELECT survey_slug, survey_title, COUNT(*) as count, MAX(submitted_at) as latest
		FROM submissions
		GROUP BY survey_slug, survey_title
		ORDER BY latest DESC
	`)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	type surveySummary struct {
		Slug     string `json:"slug"`
		Title    string `json:"title"`
		Count    int    `json:"count"`
		LatestAt string `json:"latestAt"`
	}
	var surveys []surveySummary
	for rows.Next() {
		var s surveySummary
		if err := rows.Scan(&s.Slug, &s.Title, &s.Count, &s.LatestAt); err != nil {
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		surveys = append(surveys, s)
	}
	if surveys == nil {
		surveys = []surveySummary{}
	}
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"surveys": surveys})
}

func handleAdminSurveyDetail(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/admin/surveys/")
	parts := strings.SplitN(path, "/", 2)
	slug := parts[0]
	if slug == "" {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Survey slug is required"})
		return
	}

	action := ""
	if len(parts) > 1 {
		action = parts[1]
	}

	switch r.Method {
	case http.MethodGet:
		switch action {
		case "", "submissions":
			handleAdminSubmissions(w, r, slug)
		case "stats":
			handleAdminStats(w, r, slug)
		case "export.csv":
			handleAdminExportCSV(w, r, slug)
		default:
			httpx.JSON(w, http.StatusNotFound, map[string]interface{}{"error": "Unknown endpoint"})
		}
	case http.MethodDelete:
		switch action {
		case "":
			handleDeleteSurveySubmissions(w, r, slug)
		case "submissions":
			handleDeleteSubmissionsBulk(w, r, slug)
		default:
			if strings.HasPrefix(action, "submissions/") {
				idStr := strings.TrimPrefix(action, "submissions/")
				handleDeleteSubmission(w, r, slug, idStr)
				return
			}
			httpx.JSON(w, http.StatusNotFound, map[string]interface{}{"error": "Unknown endpoint"})
		}
	default:
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func handleAdminSubmissions(w http.ResponseWriter, r *http.Request, slug string) {
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
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM submissions WHERE survey_slug = ?", slug).Scan(&total); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	type submissionWithResponses struct {
		ID          int64             `json:"id"`
		SubmittedAt string            `json:"submittedAt"`
		Email       string            `json:"email"`
		Responses   map[string]string `json:"responses"`
	}

	// Fetch only the submissions for the requested page.
	submissionRows, err := store.DB.Query(`
		SELECT id, submitted_at, email
		FROM submissions
		WHERE survey_slug = ?
		ORDER BY submitted_at DESC
		LIMIT ? OFFSET ?
	`, slug, limit, offset)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer submissionRows.Close()

	paged := make([]*submissionWithResponses, 0, limit)
	var ids []int64
	for submissionRows.Next() {
		var s submissionWithResponses
		if err := submissionRows.Scan(&s.ID, &s.SubmittedAt, &s.Email); err != nil {
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		s.Responses = make(map[string]string)
		paged = append(paged, &s)
		ids = append(ids, s.ID)
	}

	if len(ids) > 0 {
		// Build a parameterized IN clause for the paged submission IDs.
		placeholders := make([]string, len(ids))
		args := make([]interface{}, 0, len(ids))
		for i, id := range ids {
			placeholders[i] = "?"
			args = append(args, id)
		}

		responseRows, err := store.DB.Query(fmt.Sprintf(
			"SELECT submission_id, question_id, value FROM responses WHERE submission_id IN (%s)",
			strings.Join(placeholders, ","),
		), args...)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		defer responseRows.Close()

		byID := make(map[int64]*submissionWithResponses, len(paged))
		for _, s := range paged {
			byID[s.ID] = s
		}
		for responseRows.Next() {
			var submissionID int64
			var questionID, value string
			if err := responseRows.Scan(&submissionID, &questionID, &value); err != nil {
				httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
				return
			}
			if s, ok := byID[submissionID]; ok {
				s.Responses[questionID] = value
			}
		}
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"slug":        slug,
		"page":        page,
		"limit":       limit,
		"total":       total,
		"submissions": paged,
	})
}

func handleAdminStats(w http.ResponseWriter, r *http.Request, slug string) {
	var total int
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM submissions WHERE survey_slug = ?", slug).Scan(&total); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	// Daily counts for last 30 days
	rows, err := store.DB.Query(`
		SELECT date(submitted_at) as day, COUNT(*) as count
		FROM submissions
		WHERE survey_slug = ? AND submitted_at >= date('now', '-30 days')
		GROUP BY day
		ORDER BY day ASC
	`, slug)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	daily := make(map[string]int)
	for rows.Next() {
		var day string
		var count int
		if err := rows.Scan(&day, &count); err != nil {
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		daily[day] = count
	}

	// Per-question distributions (top N per question to keep responses small)
	rows2, err := store.DB.Query(`
		SELECT question_id, value, count
		FROM (
			SELECT
				r.question_id AS question_id,
				r.value AS value,
				COUNT(*) AS count,
				ROW_NUMBER() OVER (PARTITION BY r.question_id ORDER BY COUNT(*) DESC) AS rank
			FROM responses r
			JOIN submissions s ON s.id = r.submission_id
			WHERE s.survey_slug = ?
			GROUP BY r.question_id, r.value
		)
		WHERE rank <= ?
		ORDER BY question_id, count DESC
	`, slug, statsDistributionLimit)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows2.Close()

	type distribution struct {
		Value string `json:"value"`
		Count int    `json:"count"`
	}
	questionDistributions := make(map[string][]distribution)
	for rows2.Next() {
		var questionID, value string
		var count int
		if err := rows2.Scan(&questionID, &value, &count); err != nil {
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		questionDistributions[questionID] = append(questionDistributions[questionID], distribution{Value: value, Count: count})
	}

	httpx.JSON(w, http.StatusOK, map[string]interface{}{
		"slug":          slug,
		"total":         total,
		"daily":         daily,
		"distributions": questionDistributions,
	})
}

func handleAdminExportCSV(w http.ResponseWriter, r *http.Request, slug string) {
	rows, err := store.DB.Query(`
		SELECT s.id, s.submitted_at, s.email, r.question_id, r.value
		FROM submissions s
		LEFT JOIN responses r ON r.submission_id = s.id
		WHERE s.survey_slug = ?
		ORDER BY s.submitted_at DESC, r.id ASC
	`, slug)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()

	type submissionWithResponses struct {
		ID          int64
		SubmittedAt string
		Email       string
		Responses   map[string]string
	}

	all := make(map[int64]*submissionWithResponses)
	var order []int64
	questionIDs := make(map[string]struct{})
	for rows.Next() {
		var id int64
		var submittedAt, email, questionID string
		var value sql.NullString
		if err := rows.Scan(&id, &submittedAt, &email, &questionID, &value); err != nil {
			httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
			return
		}
		if _, ok := all[id]; !ok {
			all[id] = &submissionWithResponses{
				ID:          id,
				SubmittedAt: submittedAt,
				Email:       email,
				Responses:   make(map[string]string),
			}
			order = append(order, id)
		}
		if value.Valid {
			all[id].Responses[questionID] = value.String
			questionIDs[questionID] = struct{}{}
		}
	}

	headers := []string{"submission_id", "submitted_at", "email"}
	sortedQuestionIDs := make([]string, 0, len(questionIDs))
	for q := range questionIDs {
		sortedQuestionIDs = append(sortedQuestionIDs, q)
	}
	sort.Strings(sortedQuestionIDs)
	headers = append(headers, sortedQuestionIDs...)

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s-export.csv\"", slug))
	cw := csv.NewWriter(w)
	if err := cw.Write(headers); err != nil {
		return
	}

	for _, id := range order {
		s := all[id]
		row := []string{strconv.FormatInt(s.ID, 10), s.SubmittedAt, s.Email}
		for _, q := range sortedQuestionIDs {
			v := s.Responses[q]
			row = append(row, strings.ReplaceAll(v, "\n", "; "))
		}
		if err := cw.Write(row); err != nil {
			return
		}
	}
	cw.Flush()
}

func handleDeleteSubmission(w http.ResponseWriter, r *http.Request, slug, idStr string) {
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Invalid submission ID"})
		return
	}

	res, err := store.DB.Exec("DELETE FROM submissions WHERE id = ? AND survey_slug = ?", id, slug)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}

func handleDeleteSubmissionsBulk(w http.ResponseWriter, r *http.Request, slug string) {
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Invalid request body"})
		return
	}
	if len(req.IDs) == 0 {
		httpx.JSON(w, http.StatusBadRequest, map[string]interface{}{"error": "No submission IDs provided"})
		return
	}

	placeholders := make([]string, len(req.IDs))
	args := make([]interface{}, 0, len(req.IDs)+1)
	args = append(args, slug)
	for i, id := range req.IDs {
		placeholders[i] = "?"
		args = append(args, id)
	}

	res, err := store.DB.Exec(fmt.Sprintf(
		"DELETE FROM submissions WHERE survey_slug = ? AND id IN (%s)",
		strings.Join(placeholders, ","),
	), args...)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}

func handleDeleteSurveySubmissions(w http.ResponseWriter, r *http.Request, slug string) {
	res, err := store.DB.Exec("DELETE FROM submissions WHERE survey_slug = ?", slug)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]interface{}{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	httpx.JSON(w, http.StatusOK, map[string]interface{}{"success": true, "deleted": rows})
}
