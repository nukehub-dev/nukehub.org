// Package mail sends form-notification emails over SMTP.
package mail

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"net/smtp"

	"nukehub-api/internal/config"
)

// Send delivers a multipart (text + HTML) email to a single recipient with
// the given Reply-To. SMTP_* environment variables are read at call time.
func Send(to, replyTo, subject, htmlBody, textBody string) error {
	smtpHost := config.Getenv("SMTP_HOST", "localhost")
	smtpPort := config.Getenv("SMTP_PORT", "587")
	smtpUser := config.Getenv("SMTP_USER", "")
	smtpPass := config.Getenv("SMTP_PASS", "")
	smtpSecure := config.Getenv("SMTP_SECURE", "false") == "true"

	from := fmt.Sprintf("NukeHub <%s>", smtpUser)

	// Build email headers
	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s\r\n", from)
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", subject)
	fmt.Fprintf(&msg, "Reply-To: %s\r\n", replyTo)
	fmt.Fprintf(&msg, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&msg, "Content-Type: multipart/alternative; boundary=boundary123\r\n")
	fmt.Fprintf(&msg, "\r\n")
	fmt.Fprintf(&msg, "--boundary123\r\n")
	fmt.Fprintf(&msg, "Content-Type: text/plain; charset=utf-8\r\n\r\n")
	fmt.Fprintf(&msg, "%s\r\n", textBody)
	fmt.Fprintf(&msg, "--boundary123\r\n")
	fmt.Fprintf(&msg, "Content-Type: text/html; charset=utf-8\r\n\r\n")
	fmt.Fprintf(&msg, "%s\r\n", htmlBody)
	fmt.Fprintf(&msg, "--boundary123--\r\n")

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	if smtpSecure {
		// TLS connection (port 465)
		tlsConfig := &tls.Config{
			ServerName: smtpHost,
		}
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

		if err := client.Mail(smtpUser); err != nil {
			return fmt.Errorf("SMTP mail failed: %w", err)
		}
		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("SMTP rcpt failed: %w", err)
		}

		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("SMTP data failed: %w", err)
		}
		_, err = w.Write(msg.Bytes())
		if err != nil {
			return fmt.Errorf("SMTP write failed: %w", err)
		}
		err = w.Close()
		if err != nil {
			return fmt.Errorf("SMTP close failed: %w", err)
		}

		return client.Quit()
	}

	// STARTTLS connection (port 587)
	return smtp.SendMail(addr, auth, smtpUser, []string{to}, msg.Bytes())
}
