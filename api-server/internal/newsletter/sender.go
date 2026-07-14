package newsletter

// The background campaign sender: a queue-fed worker fans out per-recipient
// emails through the bulk mailer. Deliveries are snapshotted from the
// subscriber list at send time and only ever transition pending →
// sent|failed, so restarting the server mid-send never double-sends.

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"fmt"
	"mime"
	"net/smtp"
	"os"
	"strconv"
	"time"

	"nukehub-api/internal/config"
	"nukehub-api/internal/httpx"
	"nukehub-api/internal/store"
)

const (
	campaignQueueSize  = 100
	deliveryBatchSize  = 25
	defaultSendDelayMs = 1000
)

var campaignQueue = make(chan int64, campaignQueueSize)

func sendDelay() time.Duration {
	ms, err := strconv.Atoi(config.Getenv("NEWSLETTER_SEND_DELAY_MS", ""))
	if err != nil || ms < 0 {
		ms = defaultSendDelayMs
	}
	return time.Duration(ms) * time.Millisecond
}

var errNoSubscribers = errors.New("no subscribers to send to")

// launchCampaign snapshots all current subscribers into deliveries, marks
// the draft campaign as sending, and queues it for the background sender.
// Returns the number of recipients.
func launchCampaign(c *campaign) (int, error) {
	if c.Status != campaignStatusDraft {
		return 0, fmt.Errorf("campaign %d is not a draft", c.ID)
	}

	var subscriberCount int
	if err := store.DB.QueryRow("SELECT COUNT(*) FROM subscribers").Scan(&subscriberCount); err != nil {
		return 0, err
	}
	if subscriberCount == 0 {
		return 0, errNoSubscribers
	}

	if _, err := store.DB.Exec("INSERT OR IGNORE INTO deliveries (campaign_id, email) SELECT ?, email FROM subscribers", c.ID); err != nil {
		return 0, err
	}
	if _, err := store.DB.Exec("UPDATE campaigns SET status = ?, started_at = ?, updated_at = ? WHERE id = ?",
		campaignStatusSending, time.Now().UTC().Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339), c.ID); err != nil {
		return 0, err
	}

	select {
	case campaignQueue <- c.ID:
	default:
		// Queue full; the resume pass on next startup would miss it, so send inline.
		go sendCampaign(c.ID)
	}
	return subscriberCount, nil
}

// deliverCampaignEmail renders and sends one campaign email to one address.
func deliverCampaignEmail(c *campaign, email string) error {
	innerHTML, err := renderMarkdown(c.BodyMarkdown)
	if err != nil {
		return fmt.Errorf("render markdown: %w", err)
	}
	htmlBody := buildCampaignHTML(innerHTML, unsubPageURL(email))
	textBody := c.BodyMarkdown + "\n\n---\nUnsubscribe: " + unsubPageURL(email) + "\n"

	return sendBulkEmail(c.FromEmail, newsletterFromName(), email, c.Subject, htmlBody, textBody, oneClickURL(email))
}

// sendBulkEmail sends a multipart email with RFC 8058 one-click
// unsubscribe headers. The SMTP envelope sender stays SMTP_USER; the
// From header carries the campaign address (must be permitted to send as
// it, e.g. a mailcow alias of SMTP_USER).
func sendBulkEmail(fromEmail, fromName, to, subject, htmlBody, textBody, oneClickURL string) error {
	smtpHost := config.Getenv("SMTP_HOST", "localhost")
	smtpPort := config.Getenv("SMTP_PORT", "587")
	smtpUser := config.Getenv("SMTP_USER", "")
	smtpPass := config.Getenv("SMTP_PASS", "")
	smtpSecure := config.Getenv("SMTP_SECURE", "false") == "true"

	// RFC 2047-encode the subject when it contains non-ASCII characters.
	encodedSubject := httpx.SanitizeHeader(subject)
	for _, r := range subject {
		if r > 127 {
			encodedSubject = mime.QEncoding.Encode("utf-8", httpx.SanitizeHeader(subject))
			break
		}
	}

	boundaryBytes := make([]byte, 12)
	if _, err := rand.Read(boundaryBytes); err != nil {
		return fmt.Errorf("generate MIME boundary: %w", err)
	}
	boundary := "nukehub-" + hex.EncodeToString(boundaryBytes)

	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s <%s>\r\n", httpx.SanitizeHeader(fromName), httpx.SanitizeHeader(fromEmail))
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", encodedSubject)
	fmt.Fprintf(&msg, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&msg, "Content-Type: multipart/alternative; boundary=%s\r\n", boundary)
	fmt.Fprintf(&msg, "List-Unsubscribe: <%s>\r\n", oneClickURL)
	fmt.Fprintf(&msg, "List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n")
	fmt.Fprintf(&msg, "Precedence: bulk\r\n")
	fmt.Fprintf(&msg, "\r\n")
	fmt.Fprintf(&msg, "--%s\r\n", boundary)
	fmt.Fprintf(&msg, "Content-Type: text/plain; charset=utf-8\r\n\r\n")
	fmt.Fprintf(&msg, "%s\r\n", textBody)
	fmt.Fprintf(&msg, "--%s\r\n", boundary)
	fmt.Fprintf(&msg, "Content-Type: text/html; charset=utf-8\r\n\r\n")
	fmt.Fprintf(&msg, "%s\r\n", htmlBody)
	fmt.Fprintf(&msg, "--%s--\r\n", boundary)

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	// Bounces go to the envelope sender, not the From header — use the
	// dedicated bounce mailbox so the watcher can process them.
	envelopeFrom := bounceEnvelopeFrom()

	if smtpSecure {
		tlsConfig := &tls.Config{ServerName: smtpHost}
		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("TLS dial failed: %w", err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, smtpHost)
		if err != nil {
			return fmt.Errorf("SMTP client failed: %w", err)
		}
		defer client.Close()

		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP auth failed: %w", err)
		}
		if err := client.Mail(envelopeFrom); err != nil {
			return fmt.Errorf("SMTP mail failed: %w", err)
		}
		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("SMTP rcpt failed: %w", err)
		}
		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("SMTP data failed: %w", err)
		}
		if _, err := w.Write(msg.Bytes()); err != nil {
			return fmt.Errorf("SMTP write failed: %w", err)
		}
		if err := w.Close(); err != nil {
			return fmt.Errorf("SMTP close failed: %w", err)
		}
		return client.Quit()
	}

	return smtp.SendMail(addr, auth, envelopeFrom, []string{to}, msg.Bytes())
}

// startCampaignSender launches the worker and re-queues campaigns that
// were interrupted mid-send. Idempotent: only pending deliveries are
// sent, so a restarted campaign never double-sends finished recipients.
func startCampaignSender() {
	go func() {
		for id := range campaignQueue {
			sendCampaign(id)
		}
	}()

	rows, err := store.DB.Query("SELECT id FROM campaigns WHERE status = ?", campaignStatusSending)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to resume campaigns: %v\n", err)
		return
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		campaignQueue <- id
	}
}

func sendCampaign(campaignID int64) {
	c, err := loadCampaign(campaignID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Campaign %d: load failed: %v\n", campaignID, err)
		return
	}

	delay := sendDelay()
	for {
		rows, err := store.DB.Query(
			"SELECT id, email FROM deliveries WHERE campaign_id = ? AND status = ? ORDER BY id LIMIT ?",
			campaignID, deliveryStatusPending, deliveryBatchSize,
		)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Campaign %d: query deliveries failed: %v\n", campaignID, err)
			return
		}
		type delivery struct {
			id    int64
			email string
		}
		var batch []delivery
		for rows.Next() {
			var d delivery
			if err := rows.Scan(&d.id, &d.email); err == nil {
				batch = append(batch, d)
			}
		}
		rows.Close()

		if len(batch) == 0 {
			break
		}

		for _, d := range batch {
			err := deliverCampaignEmail(c, d.email)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Campaign %d: send to %s failed: %v\n", campaignID, d.email, err)
				if _, dbErr := store.DB.Exec("UPDATE deliveries SET status = ?, error = ? WHERE id = ?",
					deliveryStatusFailed, err.Error(), d.id); dbErr != nil {
					fmt.Fprintf(os.Stderr, "Campaign %d: update delivery failed: %v\n", campaignID, dbErr)
				}
			} else {
				if _, dbErr := store.DB.Exec("UPDATE deliveries SET status = ?, sent_at = ? WHERE id = ?",
					deliveryStatusSent, time.Now().UTC().Format(time.RFC3339), d.id); dbErr != nil {
					fmt.Fprintf(os.Stderr, "Campaign %d: update delivery failed: %v\n", campaignID, dbErr)
				}
			}
			time.Sleep(delay)
		}
	}

	if _, err := store.DB.Exec("UPDATE campaigns SET status = ?, finished_at = ?, updated_at = ? WHERE id = ?",
		campaignStatusSent, time.Now().UTC().Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339), campaignID); err != nil {
		fmt.Fprintf(os.Stderr, "Campaign %d: mark sent failed: %v\n", campaignID, err)
	}
	fmt.Printf("Campaign %d finished sending\n", campaignID)
}
