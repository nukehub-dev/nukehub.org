package newsletter

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"nukehub-api/internal/store"
	"nukehub-api/internal/testutil"
)

// newMux builds a mux with only this package's routes. (server.NewMux
// cannot be used here: server imports newsletter, so that would be an
// import cycle.)
func newMux() *http.ServeMux {
	mux := http.NewServeMux()
	Register(mux)
	return mux
}

func TestUnsubTokenRoundTrip(t *testing.T) {
	t.Setenv("NEWSLETTER_TOKEN_SECRET", "testsecret")

	token := makeUnsubToken("User@Example.com")
	email, ok := parseUnsubToken(token)
	if !ok || email != "user@example.com" {
		t.Fatalf("round trip failed: %q %v", email, ok)
	}
	if _, ok := parseUnsubToken(token[:len(token)-2] + "xx"); ok {
		t.Fatal("tampered token accepted")
	}
	if _, ok := parseUnsubToken("garbage"); ok {
		t.Fatal("garbage token accepted")
	}
	if _, ok := parseUnsubToken("a.b.c"); ok {
		t.Fatal("three-part token accepted")
	}
}

func TestUnsubscribeConfirmHandler(t *testing.T) {
	testutil.TempDB(t)
	t.Setenv("NEWSLETTER_TOKEN_SECRET", "testsecret")
	mux := newMux()

	if _, err := store.DB.Exec("INSERT INTO subscribers (email, subscribed_at, source) VALUES ('gone@test.dev', '2026-01-01', 'test')"); err != nil {
		t.Fatal(err)
	}

	// GET must never unsubscribe (link scanners prefetch GET URLs).
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/newsletter/unsubscribe/confirm?token="+makeUnsubToken("gone@test.dev"), nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET = %d, want 405", rec.Code)
	}

	// Invalid token is rejected and keeps the subscriber.
	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/newsletter/unsubscribe/confirm", strings.NewReader(`{"token":"bad.token"}`))
	req.Header.Set("Content-Type", "application/json")
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad token = %d, want 400", rec.Code)
	}
	var count int
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM subscribers WHERE email = 'gone@test.dev'").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatal("bad token removed subscriber")
	}

	// Valid JSON token unsubscribes; a repeat call is idempotent.
	for i := 0; i < 2; i++ {
		rec = httptest.NewRecorder()
		req = httptest.NewRequest(http.MethodPost, "/newsletter/unsubscribe/confirm", strings.NewReader(`{"token":"`+makeUnsubToken("gone@test.dev")+`"}`))
		req.Header.Set("Content-Type", "application/json")
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("confirm (attempt %d) = %d, want 200", i+1, rec.Code)
		}
	}
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM subscribers WHERE email = 'gone@test.dev'").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatal("valid token did not unsubscribe")
	}

	// RFC 8058 one-click: token in query, form body.
	if _, err := store.DB.Exec("INSERT INTO subscribers (email, subscribed_at, source) VALUES ('one@test.dev', '2026-01-01', 'test')"); err != nil {
		t.Fatal(err)
	}
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/newsletter/unsubscribe/confirm?token="+makeUnsubToken("one@test.dev"), strings.NewReader("List-Unsubscribe=One-Click"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("one-click = %d, want 200", rec.Code)
	}
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM subscribers WHERE email = 'one@test.dev'").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatal("one-click did not unsubscribe")
	}
}

func TestCampaignAdminAuthorization(t *testing.T) {
	testutil.TempDB(t)
	auth := testutil.AuthStub(t)
	testutil.FakeSMTP(t)
	t.Setenv("NEWSLETTER_TOKEN_SECRET", "testsecret")
	mux := newMux()

	staff := auth.Token(t, "newsletter-staff")
	admin := auth.Token(t, "newsletter-admin")

	// Unauthenticated requests are rejected.
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodGet, "/admin/newsletter/campaigns", "", ""))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("no token = %d, want 401", rec.Code)
	}

	// A token without newsletter roles is forbidden.
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodGet, "/admin/newsletter/campaigns", "", auth.Token(t, "survey-admin")))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("wrong role = %d, want 403", rec.Code)
	}

	// Staff can list and create campaigns.
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodGet, "/admin/newsletter/campaigns", "", staff))
	if rec.Code != http.StatusOK {
		t.Fatalf("staff list = %d, want 200", rec.Code)
	}

	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPost, "/admin/newsletter/campaigns",
		`{"title":"T","subject":"S","fromEmail":"news@nukehub.org","bodyMarkdown":"**Hi**"}`, staff))
	if rec.Code != http.StatusCreated {
		t.Fatalf("staff create = %d, want 201: %s", rec.Code, rec.Body.String())
	}
	var created campaign
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Status != campaignStatusDraft || created.Source != campaignSourceManual {
		t.Fatalf("created campaign = status %q source %q", created.Status, created.Source)
	}

	// Validation: disallowed From address and missing fields are rejected.
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPost, "/admin/newsletter/campaigns",
		`{"title":"T","subject":"S","fromEmail":"spam@evil.example","bodyMarkdown":"x"}`, admin))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad from = %d, want 400", rec.Code)
	}
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPost, "/admin/newsletter/campaigns",
		`{"title":"T","subject":"","fromEmail":"news@nukehub.org","bodyMarkdown":"x"}`, admin))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("empty subject = %d, want 400", rec.Code)
	}

	// Staff can edit drafts and send test emails, but cannot send the
	// campaign or delete it.
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPut, "/admin/newsletter/campaigns/1",
		`{"title":"T2","subject":"S2","fromEmail":"blog@nukehub.org","bodyMarkdown":"x"}`, staff))
	if rec.Code != http.StatusOK {
		t.Fatalf("staff edit = %d, want 200: %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPost, "/admin/newsletter/campaigns/1/test",
		`{"email":"staff@test.dev"}`, staff))
	if rec.Code != http.StatusOK {
		t.Fatalf("staff test send = %d, want 200: %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPost, "/admin/newsletter/campaigns/1/send", "", staff))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("staff send = %d, want 403", rec.Code)
	}
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodDelete, "/admin/newsletter/campaigns/1", "", staff))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("staff delete = %d, want 403", rec.Code)
	}

	// Sending with zero subscribers is a conflict, even for admins.
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPost, "/admin/newsletter/campaigns/1/send", "", admin))
	if rec.Code != http.StatusConflict {
		t.Fatalf("send without subscribers = %d, want 409", rec.Code)
	}

	// Admin can send and delete.
	if _, err := store.DB.Exec("INSERT INTO subscribers (email, subscribed_at, source) VALUES ('sub@test.dev', '2026-01-01', 'test')"); err != nil {
		t.Fatal(err)
	}
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPost, "/admin/newsletter/campaigns/1/send", "", admin))
	if rec.Code != http.StatusOK {
		t.Fatalf("admin send = %d, want 200: %s", rec.Code, rec.Body.String())
	}
	// A second send is rejected: the campaign is no longer a draft.
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodPost, "/admin/newsletter/campaigns/1/send", "", admin))
	if rec.Code != http.StatusConflict {
		t.Fatalf("double send = %d, want 409", rec.Code)
	}
}

func TestSendCampaignEndToEnd(t *testing.T) {
	testutil.TempDB(t)
	smtp := testutil.FakeSMTP(t)
	t.Setenv("NEWSLETTER_TOKEN_SECRET", "testsecret")
	t.Setenv("NEWSLETTER_SEND_DELAY_MS", "0")

	if _, err := store.DB.Exec("INSERT INTO subscribers (email, subscribed_at, source) VALUES ('a@test.dev', '2026-01-01', 'test')"); err != nil {
		t.Fatal(err)
	}
	res, err := store.DB.Exec("INSERT INTO campaigns (title, subject, from_email, body_markdown, status, source) VALUES ('T', 'Hello there', 'news@nukehub.org', '# Hi\n\nBody **text**', 'draft', 'manual')")
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	c, err := loadCampaign(id)
	if err != nil {
		t.Fatal(err)
	}
	total, err := launchCampaign(c)
	if err != nil || total != 1 {
		t.Fatalf("launch = total %d err %v", total, err)
	}
	sendCampaign(id)

	var status string
	if err := store.DB.QueryRow("SELECT status FROM campaigns WHERE id = ?", id).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != campaignStatusSent {
		t.Fatalf("campaign status = %q, want sent", status)
	}
	var dstatus string
	if err := store.DB.QueryRow("SELECT status FROM deliveries WHERE campaign_id = ?", id).Scan(&dstatus); err != nil {
		t.Fatal(err)
	}
	if dstatus != deliveryStatusSent {
		t.Fatalf("delivery status = %q, want sent", dstatus)
	}

	msgs := smtp.Captured()
	if len(msgs) != 1 {
		t.Fatalf("captured %d messages, want 1", len(msgs))
	}
	msg := string(msgs[0])
	for _, want := range []string{
		"From: NukeHub <news@nukehub.org>",
		"To: a@test.dev",
		"Subject: Hello there",
		"List-Unsubscribe: <https://api.nukehub.org/newsletter/unsubscribe/confirm?token=",
		"List-Unsubscribe-Post: List-Unsubscribe=One-Click",
		"<h1>Hi</h1>",
		"<strong>text</strong>",
	} {
		if !strings.Contains(msg, want) {
			t.Errorf("message missing %q", want)
		}
	}

	// The token embedded in the List-Unsubscribe URL must verify.
	start := strings.Index(msg, "unsubscribe/confirm?token=")
	if start < 0 {
		t.Fatal("no one-click URL in message")
	}
	rest := msg[start+len("unsubscribe/confirm?token="):]
	end := strings.IndexAny(rest, ">\r\n ")
	if end < 0 {
		t.Fatal("unterminated token")
	}
	email, ok := parseUnsubToken(rest[:end])
	if !ok || email != "a@test.dev" {
		t.Fatalf("embedded token = %q %v, want a@test.dev", email, ok)
	}
}

func TestListCampaignsReturnsStats(t *testing.T) {
	testutil.TempDB(t)
	auth := testutil.AuthStub(t)
	mux := newMux()
	staff := auth.Token(t, "newsletter-staff")

	res, err := store.DB.Exec("INSERT INTO campaigns (title, subject, from_email, body_markdown, status, source) VALUES ('T', 'S', 'news@nukehub.org', 'x', 'sent', 'manual')")
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	if _, err := store.DB.Exec("INSERT INTO deliveries (campaign_id, email, status) VALUES (?, 'ok@test.dev', 'sent'), (?, 'bad@test.dev', 'failed')", id, id); err != nil {
		t.Fatal(err)
	}

	// Guarded: the pool is capped at one connection, so a nested stats query
	// while the list rows are open deadlocks — fail fast instead of hanging.
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, testutil.AuthRequest(http.MethodGet, "/admin/newsletter/campaigns", "", staff))
		done <- rec
	}()
	select {
	case rec := <-done:
		if rec.Code != http.StatusOK {
			t.Fatalf("list = %d, want 200: %s", rec.Code, rec.Body.String())
		}
		var body struct {
			Campaigns []campaign `json:"campaigns"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if len(body.Campaigns) != 1 {
			t.Fatalf("listed %d campaigns, want 1", len(body.Campaigns))
		}
		got := body.Campaigns[0].Stats
		if got.Total != 2 || got.Sent != 1 || got.Failed != 1 {
			t.Fatalf("stats = %+v, want total 2 sent 1 failed 1", got)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("list campaigns deadlocked (nested query with single-connection pool)")
	}
}
