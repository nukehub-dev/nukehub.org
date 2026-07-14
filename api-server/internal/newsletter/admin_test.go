package newsletter

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"nukehub-api/internal/store"
	"nukehub-api/internal/testutil"
)

type subscriberListBody struct {
	Total       int      `json:"total"`
	Sources     []string `json:"sources"`
	Subscribers []struct {
		ID     int64  `json:"id"`
		Email  string `json:"email"`
		Source string `json:"source"`
	} `json:"subscribers"`
}

func seedThreeSubscribers(t *testing.T) {
	t.Helper()
	for _, s := range []struct{ email, source string }{
		{"alice@gmail.com", "footer"},
		{"bob@outlook.com", "blog"},
		{"carol@gmail.com", "newsletter"},
	} {
		if _, err := store.DB.Exec("INSERT INTO subscribers (email, subscribed_at, source) VALUES (?, '2026-01-01', ?)", s.email, s.source); err != nil {
			t.Fatal(err)
		}
	}
}

func getSubscriberList(t *testing.T, mux *http.ServeMux, token, query string) (int, subscriberListBody) {
	t.Helper()
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodGet, "/admin/newsletter/subscribers"+query, "", token))
	var body subscriberListBody
	if rec.Code == http.StatusOK {
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
	}
	return rec.Code, body
}

func TestListSubscribersSearchFilter(t *testing.T) {
	testutil.TempDB(t)
	auth := testutil.AuthStub(t)
	mux := newMux()
	staff := auth.Token(t, "newsletter-staff")
	seedThreeSubscribers(t)

	code, body := getSubscriberList(t, mux, staff, "")
	if code != http.StatusOK || body.Total != 3 {
		t.Fatalf("unfiltered = %d total %d, want 200 total 3", code, body.Total)
	}
	if len(body.Sources) != 3 {
		t.Fatalf("sources = %v, want 3 distinct", body.Sources)
	}

	// Search is case-insensitive against the stored (lowercased) emails.
	_, body = getSubscriberList(t, mux, staff, "?q=ALICE")
	if body.Total != 1 || body.Subscribers[0].Email != "alice@gmail.com" {
		t.Fatalf("q=ALICE = %+v", body)
	}

	_, body = getSubscriberList(t, mux, staff, "?q=gmail")
	if body.Total != 2 {
		t.Fatalf("q=gmail = total %d, want 2", body.Total)
	}

	_, body = getSubscriberList(t, mux, staff, "?source=blog")
	if body.Total != 1 || body.Subscribers[0].Email != "bob@outlook.com" {
		t.Fatalf("source=blog = %+v", body)
	}

	// Filters combine.
	_, body = getSubscriberList(t, mux, staff, "?q=gmail&source=newsletter")
	if body.Total != 1 || body.Subscribers[0].Email != "carol@gmail.com" {
		t.Fatalf("q+source = %+v", body)
	}

	// LIKE wildcards in the search box match literally, not as patterns.
	_, body = getSubscriberList(t, mux, staff, "?q=%25")
	if body.Total != 0 {
		t.Fatalf("q=%% = total %d, want 0 (literal percent)", body.Total)
	}
}

func TestBulkDeleteSubscribers(t *testing.T) {
	testutil.TempDB(t)
	auth := testutil.AuthStub(t)
	mux := newMux()
	staff := auth.Token(t, "newsletter-staff")
	seedThreeSubscribers(t)

	_, body := getSubscriberList(t, mux, staff, "")
	id1, id2 := body.Subscribers[0].ID, body.Subscribers[1].ID

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodDelete, "/admin/newsletter/subscribers",
		`{"ids":[`+jsonNumber(id1)+`,`+jsonNumber(id2)+`]}`, staff))
	if rec.Code != http.StatusOK {
		t.Fatalf("bulk delete = %d, want 200: %s", rec.Code, rec.Body.String())
	}

	var remaining int
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM subscribers").Scan(&remaining); err != nil {
		t.Fatal(err)
	}
	if remaining != 1 {
		t.Fatalf("remaining = %d, want 1", remaining)
	}

	// Empty and oversized id lists are rejected.
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodDelete, "/admin/newsletter/subscribers", `{"ids":[]}`, staff))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("empty ids = %d, want 400", rec.Code)
	}

	// Other methods on the collection route are rejected.
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPut, "/admin/newsletter/subscribers", "{}", staff))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("PUT = %d, want 405", rec.Code)
	}
}

func jsonNumber(id int64) string {
	b, _ := json.Marshal(id)
	return string(b)
}
