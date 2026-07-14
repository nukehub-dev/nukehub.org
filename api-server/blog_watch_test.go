package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func feedXML(items ...string) string {
	body := `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog</title>`
	for _, it := range items {
		body += it
	}
	return body + `</channel></rss>`
}

func rssItemXML(title, slug, pubDate string) string {
	return fmt.Sprintf(`<item><title>%s</title><link>https://blog.nukehub.org/posts/%s</link><guid>https://blog.nukehub.org/posts/%s</guid><description>%s description</description><pubDate>%s</pubDate></item>`, title, slug, slug, title, pubDate)
}

func TestBlogWatcher(t *testing.T) {
	setupTestDB(t)
	smtp := startFakeSMTP(t)
	t.Setenv("NEWSLETTER_TOKEN_SECRET", "testsecret")
	t.Setenv("NEWSLETTER_SEND_DELAY_MS", "0")

	feed := feedXML(
		rssItemXML("Post Two", "post-two", "Tue, 01 Jul 2026 10:00:00 +0000"),
		rssItemXML("Post One", "post-one", "Wed, 01 Jul 2025 10:00:00 +0000"),
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		fmt.Fprint(w, feed)
	}))
	defer srv.Close()
	t.Setenv("BLOG_RSS_URL", srv.URL)

	if _, err := db.Exec("INSERT INTO subscribers (email, subscribed_at, source) VALUES ('w@test.dev', '2026-01-01', 'test')"); err != nil {
		t.Fatal(err)
	}

	// First run initializes the cursor and sends nothing.
	if err := checkFeedOnce(); err != nil {
		t.Fatal(err)
	}
	var campaignCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM campaigns").Scan(&campaignCount); err != nil {
		t.Fatal(err)
	}
	if campaignCount != 0 {
		t.Fatalf("first run created %d campaigns, want 0", campaignCount)
	}
	cursor, _ := getSetting(blogCursorKey)
	if cursor != "https://blog.nukehub.org/posts/post-two" {
		t.Fatalf("cursor = %q, want post-two", cursor)
	}

	// A new post produces one launched campaign from the blog address.
	feed = feedXML(
		rssItemXML("Post Three", "post-three", "Fri, 10 Jul 2026 10:00:00 +0000"),
		rssItemXML("Post Two", "post-two", "Tue, 01 Jul 2026 10:00:00 +0000"),
		rssItemXML("Post One", "post-one", "Wed, 01 Jul 2025 10:00:00 +0000"),
	)
	if err := checkFeedOnce(); err != nil {
		t.Fatal(err)
	}
	var id int64
	var subject, fromEmail, source, status string
	if err := db.QueryRow("SELECT id, subject, from_email, source, status FROM campaigns").Scan(&id, &subject, &fromEmail, &source, &status); err != nil {
		t.Fatalf("expected one campaign: %v", err)
	}
	if subject != "New on the blog: Post Three" {
		t.Fatalf("subject = %q", subject)
	}
	if fromEmail != "blog@nukehub.org" || source != campaignSourceBlogRSS || status != campaignStatusSending {
		t.Fatalf("from=%q source=%q status=%q", fromEmail, source, status)
	}
	cursor, _ = getSetting(blogCursorKey)
	if cursor != "https://blog.nukehub.org/posts/post-three" {
		t.Fatalf("cursor = %q, want post-three", cursor)
	}

	// Draining the send works and the email carries the post content.
	sendCampaign(id)
	msgs := smtp.captured()
	if len(msgs) != 1 {
		t.Fatalf("captured %d messages, want 1", len(msgs))
	}
	msg := string(msgs[0])
	for _, want := range []string{"From: NukeHub <blog@nukehub.org>", "Subject: New on the blog: Post Three", "<h2>Post Three</h2>", "Read the full post"} {
		if !strings.Contains(msg, want) {
			t.Errorf("blog email missing %q", want)
		}
	}

	// A stable feed creates no duplicates.
	if err := checkFeedOnce(); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow("SELECT COUNT(*) FROM campaigns").Scan(&campaignCount); err != nil {
		t.Fatal(err)
	}
	if campaignCount != 1 {
		t.Fatalf("stable feed: %d campaigns, want 1", campaignCount)
	}

	// With zero subscribers the cursor advances without creating campaigns.
	if _, err := db.Exec("DELETE FROM subscribers"); err != nil {
		t.Fatal(err)
	}
	feed = feedXML(
		rssItemXML("Post Four", "post-four", "Mon, 13 Jul 2026 10:00:00 +0000"),
		rssItemXML("Post Three", "post-three", "Fri, 10 Jul 2026 10:00:00 +0000"),
	)
	if err := checkFeedOnce(); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow("SELECT COUNT(*) FROM campaigns").Scan(&campaignCount); err != nil {
		t.Fatal(err)
	}
	if campaignCount != 1 {
		t.Fatalf("no-subscriber run: %d campaigns, want 1", campaignCount)
	}
	cursor, _ = getSetting(blogCursorKey)
	if cursor != "https://blog.nukehub.org/posts/post-four" {
		t.Fatalf("cursor = %q, want post-four", cursor)
	}
}
