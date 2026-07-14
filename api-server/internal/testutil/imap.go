package testutil

import (
	"bufio"
	"net"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/emersion/go-imap/v2/imapclient"
)

// --- Fake IMAP server (minimal IMAP4rev1 subset) ---

type fakeIMAP struct {
	listener net.Listener
	messages [][]byte
	mu       sync.Mutex
	stores   []string
}

// FakeIMAP starts a fake IMAP server on a random port holding the given
// raw messages, and points the BOUNCE_IMAP_* env vars at it. The caller is
// responsible for swapping newsletter.DialIMAP for PlaintextDialIMAP.
func FakeIMAP(t *testing.T, messages [][]byte) *fakeIMAP {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("fake imap listen: %v", err)
	}
	s := &fakeIMAP{listener: listener, messages: messages}
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
	t.Setenv("BOUNCE_IMAP_HOST", "127.0.0.1")
	t.Setenv("BOUNCE_IMAP_PORT", port)
	t.Setenv("BOUNCE_IMAP_USER", "bounces@nukehub.org")
	t.Setenv("BOUNCE_IMAP_PASS", "secret")
	t.Setenv("BOUNCE_IMAP_FOLDER", "INBOX")
	return s
}

// PlaintextDialIMAP is a newsletter.DialIMAP-compatible dialer that speaks
// plaintext to the fake server instead of TLS.
func PlaintextDialIMAP(host, addr string) (*imapclient.Client, error) {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return nil, err
	}
	return imapclient.New(conn, nil), nil
}

func (s *fakeIMAP) handle(conn net.Conn) {
	defer conn.Close()
	r := bufio.NewReader(conn)
	w := func(line string) { conn.Write([]byte(line + "\r\n")) }
	w("* OK fake IMAP4rev1 Service Ready")
	for {
		line, err := r.ReadString('\n')
		if err != nil {
			return
		}
		parts := strings.SplitN(strings.TrimSpace(line), " ", 3)
		if len(parts) < 2 {
			continue
		}
		tag, verb := parts[0], strings.ToUpper(parts[1])
		switch verb {
		case "CAPABILITY":
			w("* CAPABILITY IMAP4rev1 AUTH=PLAIN")
			w(tag + " OK Capability completed")
		case "AUTHENTICATE", "LOGIN":
			w(tag + " OK Authentication successful")
		case "ID":
			w("* ID NIL")
			w(tag + " OK ID completed")
		case "ENABLE":
			w("* ENABLED")
			w(tag + " OK")
		case "SELECT", "EXAMINE":
			w(`* FLAGS (\Answered \Flagged \Deleted \Seen \Draft)`)
			w("* " + strconv.Itoa(len(s.messages)) + " EXISTS")
			w("* 0 RECENT")
			w("* OK [UIDVALIDITY 1] UIDs valid")
			w(`* OK [PERMANENTFLAGS (\Seen)] Limited`)
			w(tag + " OK [READ-WRITE] Select completed")
		case "SEARCH":
			var nums []string
			for i := 1; i <= len(s.messages); i++ {
				nums = append(nums, strconv.Itoa(i))
			}
			w("* SEARCH " + strings.Join(nums, " "))
			w(tag + " OK Search completed")
		case "FETCH":
			for i, m := range s.messages {
				w("* " + strconv.Itoa(i+1) + " FETCH (BODY[] {" + strconv.Itoa(len(m)) + "}")
				conn.Write(m)
				w(")")
			}
			w(tag + " OK Fetch completed")
		case "STORE":
			s.mu.Lock()
			s.stores = append(s.stores, line)
			s.mu.Unlock()
			w(tag + " OK Store completed")
		case "LOGOUT":
			w("* BYE Logging out")
			w(tag + " OK Logout completed")
			return
		default:
			w(tag + " OK")
		}
	}
}

// StoreCommands returns a copy of the raw STORE command lines received.
func (s *fakeIMAP) StoreCommands() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string{}, s.stores...)
}
