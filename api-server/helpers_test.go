package main

// Shared test fixtures: temp database, fake SMTP server, fake IMAP server,
// and a stub Keycloak JWKS issuer for admin-role tests.

import (
	"bufio"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/emersion/go-imap/v2/imapclient"
	"github.com/golang-jwt/jwt/v5"
)

// setupTestDB opens a fresh temp database and resets per-process state so
// tests do not leak into each other.
func setupTestDB(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_PATH", t.TempDir()+"/test.db")
	if err := initDB(); err != nil {
		t.Fatalf("initDB: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	rateLimitMu.Lock()
	rateLimitStore = make(map[string]*rateLimitEntry)
	rateLimitMu.Unlock()
}

// --- Fake SMTP server ---

type fakeSMTP struct {
	listener net.Listener
	mu       sync.Mutex
	messages [][]byte
}

func startFakeSMTP(t *testing.T) *fakeSMTP {
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

func (s *fakeSMTP) captured() [][]byte {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([][]byte{}, s.messages...)
}

// --- Fake IMAP server (minimal IMAP4rev1 subset) ---

type fakeIMAP struct {
	listener net.Listener
	messages [][]byte
	mu       sync.Mutex
	stores   []string
}

func startFakeIMAP(t *testing.T, messages [][]byte) *fakeIMAP {
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

	// Swap the TLS dialer for a plaintext connection to the fake server.
	previousDial := dialIMAP
	dialIMAP = func(host, addr string) (*imapclient.Client, error) {
		conn, err := net.Dial("tcp", addr)
		if err != nil {
			return nil, err
		}
		return imapclient.New(conn, nil), nil
	}
	t.Cleanup(func() { dialIMAP = previousDial })
	return s
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

func (s *fakeIMAP) storeCommands() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string{}, s.stores...)
}

// --- Keycloak JWKS stub ---

type authStub struct {
	server   *httptest.Server
	key      *rsa.PrivateKey
	clientID string
}

func setupAuthStub(t *testing.T) *authStub {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	stub := &authStub{key: key, clientID: "nukehub-web"}

	mux := http.NewServeMux()
	mux.HandleFunc("/realms/test/protocol/openid-connect/certs", func(w http.ResponseWriter, _ *http.Request) {
		n := base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes())
		e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.PublicKey.E)).Bytes())
		json.NewEncoder(w).Encode(map[string]interface{}{
			"keys": []map[string]interface{}{
				{"kid": "test-key", "kty": "RSA", "use": "sig", "alg": "RS256", "n": n, "e": e},
			},
		})
	})
	stub.server = httptest.NewServer(mux)
	t.Cleanup(stub.server.Close)

	jwksCache = newKeycloakJWKS(stub.server.URL, "test")
	if err := jwksCache.refresh(); err != nil {
		t.Fatalf("jwks refresh: %v", err)
	}
	t.Setenv("AUTH_CLIENT_ID", stub.clientID)
	return stub
}

// token mints a valid RS256 JWT carrying the given client roles.
func (a *authStub) token(t *testing.T, roles ...string) string {
	t.Helper()
	claims := jwt.MapClaims{
		"iss": a.server.URL + "/realms/test",
		"azp": a.clientID,
		"exp": time.Now().Add(time.Hour).Unix(),
		"resource_access": map[string]interface{}{
			a.clientID: map[string]interface{}{"roles": roles},
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = "test-key"
	signed, err := tok.SignedString(a.key)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

// authRequest builds a request with the stub token attached when token is
// non-empty.
func authRequest(method, path, body, token string) *http.Request {
	var r *http.Request
	if body == "" {
		r = httptest.NewRequest(method, path, nil)
	} else {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	return r
}
