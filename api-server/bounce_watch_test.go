package main

import (
	"strings"
	"testing"
)

func TestParseBounceMultiRecipient(t *testing.T) {
	body := []byte("Content-Type: multipart/report; report-type=delivery-status\r\n" +
		"\r\n" +
		"Reporting-MTA: dns; mail.nukehub.org\r\n" +
		"\r\n" +
		"Final-Recipient: rfc822; Gone@Test.dev\r\n" +
		"Action: failed\r\n" +
		"Status: 5.1.1\r\n" +
		"\r\n" +
		"Final-Recipient: rfc822; full@test.dev\r\n" +
		"Action: delayed\r\n" +
		"Status: 4.2.2\r\n")

	results := parseBounce(body)
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2", len(results))
	}
	if results[0].Email != "gone@test.dev" || !results[0].Permanent || results[0].Status != "5.1.1" {
		t.Fatalf("result[0] = %+v, want gone@test.dev permanent 5.1.1", results[0])
	}
	if results[1].Email != "full@test.dev" || results[1].Permanent {
		t.Fatalf("result[1] = %+v, want full@test.dev transient", results[1])
	}

	if r := parseBounce([]byte("From: a@b.c\r\nSubject: hi\r\n\r\nhello\r\n")); r != nil {
		t.Fatalf("non-DSN parsed as bounce: %+v", r)
	}
}

const hardBounceDSN = "From: MAILER-DAEMON@mail.nukehub.org\r\n" +
	"To: bounces@nukehub.org\r\n" +
	"Subject: Undelivered Mail Returned to Sender\r\n" +
	"Content-Type: multipart/report; report-type=delivery-status; boundary=\"abc\"\r\n" +
	"\r\n" +
	"--abc\r\n" +
	"Content-Type: text/plain\r\n" +
	"\r\n" +
	"Your message could not be delivered.\r\n" +
	"\r\n" +
	"--abc\r\n" +
	"Content-Type: message/delivery-status\r\n" +
	"\r\n" +
	"Reporting-MTA: dns; mail.nukehub.org\r\n" +
	"\r\n" +
	"Final-Recipient: rfc822; dead@test.dev\r\n" +
	"Action: failed\r\n" +
	"Status: 5.1.1\r\n" +
	"\r\n" +
	"--abc--\r\n"

const softBounceDSN = "From: MAILER-DAEMON@mail.nukehub.org\r\n" +
	"To: bounces@nukehub.org\r\n" +
	"Subject: Undelivered Mail Returned to Sender\r\n" +
	"Content-Type: multipart/report; report-type=delivery-status; boundary=\"def\"\r\n" +
	"\r\n" +
	"--def\r\n" +
	"Content-Type: message/delivery-status\r\n" +
	"\r\n" +
	"Reporting-MTA: dns; mail.nukehub.org\r\n" +
	"\r\n" +
	"Final-Recipient: rfc822; flaky@test.dev\r\n" +
	"Action: delayed\r\n" +
	"Status: 4.4.1\r\n" +
	"\r\n" +
	"--def--\r\n"

const notABounce = "From: someone@example.com\r\n" +
	"To: bounces@nukehub.org\r\n" +
	"Subject: hello there\r\n" +
	"\r\n" +
	"Just a regular email, not a bounce.\r\n"

func TestBounceWatcherEndToEnd(t *testing.T) {
	setupTestDB(t)
	imap := startFakeIMAP(t, [][]byte{[]byte(hardBounceDSN), []byte(softBounceDSN), []byte(notABounce)})

	for _, email := range []string{"dead@test.dev", "flaky@test.dev", "keep@test.dev"} {
		if _, err := db.Exec("INSERT INTO subscribers (email, subscribed_at, source) VALUES (?, '2026-01-01', 'test')", email); err != nil {
			t.Fatal(err)
		}
	}

	if err := checkBouncesOnce(); err != nil {
		t.Fatal(err)
	}

	exists := func(email string) bool {
		var n int
		if err := db.QueryRow("SELECT COUNT(*) FROM subscribers WHERE email = ?", email).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n > 0
	}
	if exists("dead@test.dev") {
		t.Error("hard-bounced subscriber was not removed")
	}
	if !exists("flaky@test.dev") {
		t.Error("soft-bounced subscriber was wrongly removed")
	}
	if !exists("keep@test.dev") {
		t.Error("unrelated subscriber was wrongly removed")
	}

	// Only the two DSN messages may be marked seen; the non-DSN message
	// stays unread for a human.
	stores := imap.storeCommands()
	if len(stores) != 1 {
		t.Fatalf("got %d STORE commands, want 1: %v", len(stores), stores)
	}
	if !strings.Contains(stores[0], "1:2") && !strings.Contains(stores[0], "1,2") {
		t.Errorf("STORE command = %q, want messages 1 and 2 only", stores[0])
	}
	if strings.Contains(stores[0], "3") {
		t.Errorf("non-DSN message was marked seen: %q", stores[0])
	}
}
