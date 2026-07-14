package main

import (
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Blog watcher: polls the blog's RSS feed and auto-sends a campaign from
// BLOG_FROM_EMAIL for every new post. Opt-in via BLOG_AUTO_SEND=true.
//
// Safety properties:
//   - First run (no cursor) records the newest post and sends nothing, so
//     enabling the watcher never spams the whole archive.
//   - The cursor only advances past successfully launched posts; a failure
//     is retried on the next tick.
//   - No subscribers → skip campaign creation entirely, still advance the
//     cursor.

const (
	blogCursorKey       = "blog_rss_last_guid"
	defaultBlogRSSURL   = "https://blog.nukehub.org/rss.xml"
	defaultPollInterval = 30 * time.Minute
	feedFetchTimeout    = 15 * time.Second
	maxExcerptLen       = 500
)

func blogAutoSendEnabled() bool {
	return getEnv("BLOG_AUTO_SEND", "false") == "true"
}

func blogRSSURL() string {
	return getEnv("BLOG_RSS_URL", defaultBlogRSSURL)
}

func blogPollInterval() time.Duration {
	ms, err := strconv.Atoi(getEnv("BLOG_RSS_POLL_INTERVAL_MS", ""))
	if err != nil || ms < 60_000 {
		return defaultPollInterval
	}
	return time.Duration(ms) * time.Millisecond
}

// --- RSS parsing (RSS 2.0, as emitted by @astrojs/rss) ---

type feedItem struct {
	Title       string
	Link        string
	GUID        string
	Description string
	PubDate     time.Time
}

type rssDocument struct {
	Channel struct {
		Items []struct {
			Title       string `xml:"title"`
			Link        string `xml:"link"`
			GUID        string `xml:"guid"`
			Description string `xml:"description"`
			PubDate     string `xml:"pubDate"`
		} `xml:"item"`
	} `xml:"channel"`
}

func fetchFeed(url string) ([]feedItem, error) {
	client := &http.Client{Timeout: feedFetchTimeout}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("fetch feed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch feed: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, fmt.Errorf("read feed: %w", err)
	}

	var doc rssDocument
	if err := xml.Unmarshal(body, &doc); err != nil {
		return nil, fmt.Errorf("parse feed: %w", err)
	}

	var items []feedItem
	for _, raw := range doc.Channel.Items {
		guid := strings.TrimSpace(raw.GUID)
		if guid == "" {
			guid = strings.TrimSpace(raw.Link)
		}
		pubDate, _ := time.Parse(time.RFC1123Z, strings.TrimSpace(raw.PubDate))
		if pubDate.IsZero() {
			pubDate, _ = time.Parse(time.RFC1123, strings.TrimSpace(raw.PubDate))
		}
		items = append(items, feedItem{
			Title:       strings.TrimSpace(raw.Title),
			Link:        strings.TrimSpace(raw.Link),
			GUID:        guid,
			Description: stripHTML(raw.Description),
			PubDate:     pubDate,
		})
	}
	return items, nil
}

var htmlTagRegex = regexp.MustCompile(`<[^>]*>`)
var whitespaceRegex = regexp.MustCompile(`\s+`)

// stripHTML turns an RSS description (which may contain markup) into a
// plain-text excerpt safe to embed in Markdown.
func stripHTML(s string) string {
	s = htmlTagRegex.ReplaceAllString(s, " ")
	s = html.UnescapeString(s)
	s = whitespaceRegex.ReplaceAllString(s, " ")
	s = strings.TrimSpace(s)
	if len(s) > maxExcerptLen {
		s = strings.TrimSpace(s[:maxExcerptLen]) + "…"
	}
	return s
}

// --- Cursor ---

func getSetting(key string) (string, error) {
	var value string
	err := db.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	return value, err
}

func setSetting(key, value string) error {
	_, err := db.Exec(
		"INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
		key, value,
	)
	return err
}

// --- Watcher ---

// startBlogWatcher polls the feed on a ticker when BLOG_AUTO_SEND is on.
func startBlogWatcher() {
	if !blogAutoSendEnabled() {
		return
	}
	fmt.Printf("Blog watcher enabled: polling %s every %s\n", blogRSSURL(), blogPollInterval())
	go func() {
		runBlogCheck()
		ticker := time.NewTicker(blogPollInterval())
		defer ticker.Stop()
		for range ticker.C {
			runBlogCheck()
		}
	}()
}

// runBlogCheck performs one poll pass. Errors are logged, never fatal.
func runBlogCheck() {
	if err := checkFeedOnce(); err != nil {
		fmt.Fprintf(os.Stderr, "Blog watcher: %v\n", err)
	}
}

func checkFeedOnce() error {
	items, err := fetchFeed(blogRSSURL())
	if err != nil {
		return err
	}
	if len(items) == 0 {
		return nil
	}
	// Feed order is newest-first; iterate defensively by pubDate anyway.
	newest := items[0]
	for _, item := range items[1:] {
		if item.PubDate.After(newest.PubDate) {
			newest = item
		}
	}

	cursor, err := getSetting(blogCursorKey)
	if err != nil {
		// First run: record the newest post, send nothing.
		if err := setSetting(blogCursorKey, newest.GUID); err != nil {
			return fmt.Errorf("init cursor: %w", err)
		}
		fmt.Printf("Blog watcher: cursor initialized at %q, not sending backlog\n", newest.Title)
		return nil
	}

	// Items before the cursor in the newest-first feed are new posts.
	cursorIdx := -1
	for i, item := range items {
		if item.GUID == cursor {
			cursorIdx = i
			break
		}
	}
	if cursorIdx < 0 {
		// Cursor aged out of the feed window. Reset without sending —
		// never risk spamming a backlog.
		if err := setSetting(blogCursorKey, newest.GUID); err != nil {
			return fmt.Errorf("reset cursor: %w", err)
		}
		fmt.Printf("Blog watcher: cursor %q not in feed, reset to %q without sending\n", cursor, newest.Title)
		return nil
	}

	// Reverse to oldest-first so multi-post gaps send in publish order.
	var newItems []feedItem
	for i := cursorIdx - 1; i >= 0; i-- {
		newItems = append(newItems, items[i])
	}
	if len(newItems) == 0 {
		return nil
	}

	var subscriberCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM subscribers").Scan(&subscriberCount); err != nil {
		return fmt.Errorf("count subscribers: %w", err)
	}

	for _, item := range newItems {
		if subscriberCount > 0 {
			if err := sendPostCampaign(item); err != nil {
				// Stop here so the post is retried next tick instead of skipped.
				return fmt.Errorf("send campaign for %q: %w", item.Title, err)
			}
			fmt.Printf("Blog watcher: sent campaign for %q\n", item.Title)
		} else {
			fmt.Printf("Blog watcher: no subscribers, skipping campaign for %q\n", item.Title)
		}
		if err := setSetting(blogCursorKey, item.GUID); err != nil {
			return fmt.Errorf("advance cursor: %w", err)
		}
	}
	return nil
}

// sendPostCampaign creates and immediately launches a campaign for one
// blog post.
func sendPostCampaign(item feedItem) error {
	title := item.Title
	if len(title) > maxCampaignTitleLen-10 {
		title = title[:maxCampaignTitleLen-10]
	}
	subject := "New on the blog: " + item.Title
	if len(subject) > maxCampaignSubjectLen {
		subject = subject[:maxCampaignSubjectLen-1] + "…"
	}

	body := fmt.Sprintf("A new post is up on the [NukeHub blog](%s):\n\n## %s\n\n%s\n\n[Read the full post](%s)",
		strings.TrimSuffix(getEnv("BLOG_URL", "https://blog.nukehub.org"), "/"),
		item.Title, item.Description, item.Link)

	res, err := db.Exec(
		"INSERT INTO campaigns (title, subject, from_email, body_markdown, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		title, subject, blogFromEmail(), body, campaignStatusDraft, campaignSourceBlogRSS,
		time.Now().UTC().Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		return err
	}
	id, _ := res.LastInsertId()

	c, err := loadCampaign(id)
	if err != nil {
		return err
	}
	_, err = launchCampaign(c)
	return err
}
