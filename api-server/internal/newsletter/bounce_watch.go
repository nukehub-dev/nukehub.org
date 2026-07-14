package newsletter

import (
	"crypto/tls"
	"fmt"
	"net"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/emersion/go-imap/v2"
	"github.com/emersion/go-imap/v2/imapclient"

	"nukehub-api/internal/config"
	"nukehub-api/internal/store"
)

// Bounce processing: polls the bounce mailbox over IMAP for Delivery
// Status Notifications (RFC 3464, which Postfix/mailcow emits) and removes
// hard-bounced addresses from the subscriber list. Opt-in via
// BOUNCE_CHECK_ENABLED=true.
//
// Design:
//   - Campaign emails use BOUNCE_EMAIL as their envelope sender, so async
//     bounces land in that mailbox instead of the SMTP_USER inbox.
//   - Only messages containing DSN per-recipient blocks are processed and
//     marked \Seen. Anything else is left unread for a human; nothing is
//     ever deleted from the mailbox.
//   - 5xx (permanent) failures remove the subscriber. 4xx (transient)
//     failures are ignored — the address may recover.

const (
	defaultBounceCheckInterval = time.Hour
	minBounceCheckInterval     = 5 * time.Minute
)

var bounceCheckMu sync.Mutex

func bounceCheckEnabled() bool {
	return config.Getenv("BOUNCE_CHECK_ENABLED", "false") == "true"
}

// bounceEnvelopeFrom is the envelope sender (MAIL FROM) for campaign
// emails. Bounces are delivered here, not to the From header address.
func bounceEnvelopeFrom() string {
	return config.Getenv("BOUNCE_EMAIL", "bounces@nukehub.org")
}

func bounceIMAPHost() string {
	return config.Getenv("BOUNCE_IMAP_HOST", config.Getenv("SMTP_HOST", ""))
}

func bounceIMAPPort() string {
	return config.Getenv("BOUNCE_IMAP_PORT", "993")
}

func bounceIMAPUser() string {
	return config.Getenv("BOUNCE_IMAP_USER", config.Getenv("SMTP_USER", ""))
}

func bounceIMAPPass() string {
	return config.Getenv("BOUNCE_IMAP_PASS", config.Getenv("SMTP_PASS", ""))
}

func bounceIMAPFolder() string {
	return config.Getenv("BOUNCE_IMAP_FOLDER", "INBOX")
}

func bounceCheckInterval() time.Duration {
	ms, err := strconv.Atoi(config.Getenv("BOUNCE_CHECK_INTERVAL_MS", ""))
	if err != nil || time.Duration(ms)*time.Millisecond < minBounceCheckInterval {
		return defaultBounceCheckInterval
	}
	return time.Duration(ms) * time.Millisecond
}

// --- DSN parsing ---

var (
	finalRecipientRegex = regexp.MustCompile(`(?mi)^Final-Recipient:\s*rfc822\s*;\s*(\S+)`)
	dsnStatusRegex      = regexp.MustCompile(`(?mi)^Status:\s*(\d)\.\d+\.\d+`)
	headerBlockSplit    = regexp.MustCompile(`\r?\n\r?\n`)
)

type bounceResult struct {
	Email     string
	Permanent bool
	Status    string
}

// parseBounce extracts per-recipient results from a raw DSN message. The
// delivery-status part of a bounce is plain text inside the MIME message,
// so scanning header blocks of the whole raw body finds them regardless of
// the outer MIME structure. Returns nil for non-DSN messages.
func parseBounce(body []byte) []bounceResult {
	var results []bounceResult
	for _, block := range headerBlockSplit.Split(string(body), -1) {
		m := finalRecipientRegex.FindStringSubmatch(block)
		if m == nil {
			continue
		}
		result := bounceResult{Email: strings.ToLower(m[1])}
		if s := dsnStatusRegex.FindStringSubmatch(block); s != nil {
			result.Status = s[0][len("Status:"):]
			result.Status = strings.TrimSpace(result.Status)
			result.Permanent = s[1] == "5"
		}
		results = append(results, result)
	}
	return results
}

// processBounceResults removes hard-bounced subscribers. Returns the
// number of removed addresses.
func processBounceResults(results []bounceResult) int {
	removed := 0
	for _, r := range results {
		if !r.Permanent {
			fmt.Printf("Bounce watcher: transient failure for %s (status %s), keeping subscriber\n", r.Email, r.Status)
			continue
		}
		res, err := store.DB.Exec("DELETE FROM subscribers WHERE email = ?", r.Email)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Bounce watcher: delete %s failed: %v\n", r.Email, err)
			continue
		}
		if n, _ := res.RowsAffected(); n > 0 {
			removed++
			fmt.Printf("Bounce watcher: removed hard-bounced subscriber %s (status %s)\n", r.Email, r.Status)
		}
	}
	return removed
}

// --- Watcher ---

// startBounceWatcher polls the bounce mailbox when BOUNCE_CHECK_ENABLED.
func startBounceWatcher() {
	if !bounceCheckEnabled() {
		return
	}
	if bounceIMAPHost() == "" || bounceIMAPUser() == "" {
		fmt.Fprintln(os.Stderr, "Bounce watcher: enabled but BOUNCE_IMAP_HOST/User not configured; disabled")
		return
	}
	fmt.Printf("Bounce watcher enabled: polling %s@%s:%s/%s every %s\n",
		bounceIMAPUser(), bounceIMAPHost(), bounceIMAPPort(), bounceIMAPFolder(), bounceCheckInterval())
	go func() {
		runBounceCheck()
		ticker := time.NewTicker(bounceCheckInterval())
		defer ticker.Stop()
		for range ticker.C {
			runBounceCheck()
		}
	}()
}

func runBounceCheck() {
	// A wedged IMAP connection must not pile up overlapping checks.
	if !bounceCheckMu.TryLock() {
		return
	}
	defer bounceCheckMu.Unlock()
	if err := checkBouncesOnce(); err != nil {
		fmt.Fprintf(os.Stderr, "Bounce watcher: %v\n", err)
	}
}

// DialIMAP dials the bounce mailbox. A variable so tests can substitute a
// plaintext connection; production always uses TLS.
var DialIMAP = func(host, addr string) (*imapclient.Client, error) {
	return imapclient.DialTLS(addr, &imapclient.Options{
		TLSConfig: &tls.Config{ServerName: host},
	})
}

func checkBouncesOnce() error {
	addr := net.JoinHostPort(bounceIMAPHost(), bounceIMAPPort())
	client, err := DialIMAP(bounceIMAPHost(), addr)
	if err != nil {
		return fmt.Errorf("imap dial: %w", err)
	}
	defer client.Close()

	if err := client.Login(bounceIMAPUser(), bounceIMAPPass()).Wait(); err != nil {
		return fmt.Errorf("imap login: %w", err)
	}
	if _, err := client.Select(bounceIMAPFolder(), nil).Wait(); err != nil {
		return fmt.Errorf("imap select: %w", err)
	}

	searchData, err := client.Search(
		&imap.SearchCriteria{NotFlag: []imap.Flag{imap.FlagSeen}},
		&imap.SearchOptions{ReturnAll: true},
	).Wait()
	if err != nil {
		return fmt.Errorf("imap search: %w", err)
	}
	seqSet, ok := searchData.All.(imap.SeqSet)
	if !ok || len(seqSet) == 0 {
		return nil
	}

	messages, err := client.Fetch(seqSet, &imap.FetchOptions{
		BodySection: []*imap.FetchItemBodySection{{Peek: true}},
	}).Collect()
	if err != nil {
		return fmt.Errorf("imap fetch: %w", err)
	}

	var seenSet imap.SeqSet
	totalRemoved := 0
	for _, msg := range messages {
		if len(msg.BodySection) == 0 {
			continue
		}
		results := parseBounce(msg.BodySection[0].Bytes)
		if len(results) == 0 {
			// Not a DSN: leave unread for a human.
			continue
		}
		totalRemoved += processBounceResults(results)
		seenSet.AddNum(msg.SeqNum)
	}

	if len(seenSet) > 0 {
		if _, err := client.Store(seenSet, &imap.StoreFlags{
			Op:     imap.StoreFlagsAdd,
			Silent: true,
			Flags:  []imap.Flag{imap.FlagSeen},
		}, nil).Collect(); err != nil {
			return fmt.Errorf("imap store: %w", err)
		}
	}
	if totalRemoved > 0 {
		fmt.Printf("Bounce watcher: removed %d hard-bounced subscriber(s)\n", totalRemoved)
	}
	return nil
}
