package testutil

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"nukehub-api/internal/auth"
)

// --- Keycloak JWKS stub ---

type authStub struct {
	server   *httptest.Server
	key      *rsa.PrivateKey
	clientID string
}

// AuthStub starts a stub Keycloak JWKS issuer, points auth.Default at it,
// and sets AUTH_CLIENT_ID. Token mints RS256 JWTs carrying client roles.
func AuthStub(t *testing.T) *authStub {
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

	auth.Default = auth.New(stub.server.URL, "test")
	if err := auth.Default.Refresh(); err != nil {
		t.Fatalf("jwks refresh: %v", err)
	}
	t.Setenv("AUTH_CLIENT_ID", stub.clientID)
	return stub
}

// Token mints a valid RS256 JWT carrying the given client roles.
func (a *authStub) Token(t *testing.T, roles ...string) string {
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

// AuthRequest builds a request with the stub token attached when token is
// non-empty.
func AuthRequest(method, path, body, token string) *http.Request {
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
