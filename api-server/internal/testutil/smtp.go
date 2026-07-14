package testutil

import (
	"bufio"
	"net"
	"strings"
	"sync"
	"testing"
)

// --- Fake SMTP server ---

type fakeSMTP struct {
	listener net.Listener
	mu       sync.Mutex
	messages [][]byte
}

// FakeSMTP starts a fake SMTP server on a random port and points the
// SMTP_* env vars at it. Captured returns the DATA payloads it received.
func FakeSMTP(t *testing.T) *fakeSMTP {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("fake smtp listen: %v", err)
	}
	s := &fakeSMTP{listener: listener}
	t.Cleanup(func() { listener.Close() })
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			go s.handle(conn)
		}
	}()

	_, port, _ := net.SplitHostPort(listener.Addr().String())
	t.Setenv("SMTP_HOST", "127.0.0.1")
	t.Setenv("SMTP_PORT", port)
	t.Setenv("SMTP_USER", "test@nukehub.org")
	t.Setenv("SMTP_PASS", "secret")
	t.Setenv("SMTP_SECURE", "false")
	return s
}

func (s *fakeSMTP) handle(conn net.Conn) {
	defer conn.Close()
	r := bufio.NewReader(conn)
	w := func(line string) { conn.Write([]byte(line + "\r\n")) }
	w("220 fake ESMTP")
	for {
		line, err := r.ReadString('\n')
		if err != nil {
			return
		}
		cmd := strings.ToUpper(strings.TrimSpace(line))
		switch {
		case strings.HasPrefix(cmd, "EHLO"):
			w("250-fake greets you")
			w("250 AUTH PLAIN")
		case strings.HasPrefix(cmd, "HELO"):
			w("250 fake")
		case strings.HasPrefix(cmd, "AUTH"):
			w("235 2.7.0 Authentication successful")
		case strings.HasPrefix(cmd, "MAIL"):
			w("250 2.1.0 Ok")
		case strings.HasPrefix(cmd, "RCPT"):
			w("250 2.1.5 Ok")
		case strings.HasPrefix(cmd, "DATA"):
			w("354 End data with <CR><LF>.<CR><LF>")
			var data []byte
			for {
				l, err := r.ReadString('\n')
				if err != nil {
					return
				}
				if strings.TrimRight(l, "\r\n") == "." {
					break
				}
				data = append(data, []byte(l)...)
			}
			s.mu.Lock()
			s.messages = append(s.messages, data)
			s.mu.Unlock()
			w("250 2.0.0 Ok")
		case strings.HasPrefix(cmd, "QUIT"):
			w("221 2.0.0 Bye")
			return
		default:
			w("250 Ok")
		}
	}
}

// Captured returns a copy of the DATA payloads received so far.
func (s *fakeSMTP) Captured() [][]byte {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([][]byte{}, s.messages...)
}
