// Package auth verifies NukeAuth (Keycloak) JWTs against the realm JWKS
// endpoint and provides role-gating middleware for admin endpoints.
package auth

import (
	"crypto/rsa"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"nukehub-api/internal/config"
)

// Client role names under AUTH_CLIENT_ID.
const (
	SurveyAdminRole     = "survey-admin"
	SurveyViewerRole    = "survey-viewer"
	NewsletterAdminRole = "newsletter-admin"
	NewsletterStaffRole = "newsletter-staff"
)

// Default is the process-wide JWKS cache used by the role middleware. Set
// by main (and by tests) before serving requests.
var Default *JWKS

// JWKS caches a Keycloak realm's signing keys and verifies RS256 tokens.
type JWKS struct {
	authURL string
	realm   string
	mu      sync.RWMutex
	keys    map[string]interface{}
}

// New creates a JWKS cache for the given base URL and realm.
func New(authURL, realm string) *JWKS {
	return &JWKS{
		authURL: authURL,
		realm:   realm,
		keys:    make(map[string]interface{}),
	}
}

func (k *JWKS) jwksURL() string {
	return fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs", k.authURL, k.realm)
}

func (k *JWKS) expectedIssuer() string {
	return fmt.Sprintf("%s/realms/%s", k.authURL, k.realm)
}

// StartAutoRefresh refreshes the key set every interval in the background.
func (k *JWKS) StartAutoRefresh(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		for range ticker.C {
			if err := k.Refresh(); err != nil {
				fmt.Fprintf(os.Stderr, "JWKS refresh failed: %v\n", err)
			}
		}
	}()
}

// Refresh fetches the realm's signing keys and replaces the cache.
func (k *JWKS) Refresh() error {
	resp, err := http.Get(k.jwksURL())
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned %d", resp.StatusCode)
	}

	var jwks struct {
		Keys []struct {
			Kid string   `json:"kid"`
			Kty string   `json:"kty"`
			Use string   `json:"use"`
			N   string   `json:"n"`
			E   string   `json:"e"`
			X5c []string `json:"x5c"`
			Alg string   `json:"alg"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return err
	}

	newKeys := make(map[string]interface{})
	for _, key := range jwks.Keys {
		if key.Kty != "RSA" || (key.Use != "" && key.Use != "sig") {
			continue
		}
		pubKey, err := parseRSAPublicKey(key.N, key.E)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to parse RSA key %s: %v\n", key.Kid, err)
			continue
		}
		newKeys[key.Kid] = pubKey
	}

	k.mu.Lock()
	k.keys = newKeys
	k.mu.Unlock()
	return nil
}

func (k *JWKS) getKey(kid string) interface{} {
	k.mu.RLock()
	defer k.mu.RUnlock()
	return k.keys[kid]
}

// VerifyToken validates an RS256 bearer token against the cached keys and
// the expected issuer, refreshing the cache once on an unknown key ID.
func (k *JWKS) VerifyToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("token missing kid header")
		}
		key := k.getKey(kid)
		if key == nil {
			return nil, fmt.Errorf("key not found: %s", kid)
		}
		return key, nil
	}, jwt.WithIssuer(k.expectedIssuer()), jwt.WithValidMethods([]string{"RS256"}))
	if err != nil {
		// If key is missing, try refreshing JWKS once
		if strings.Contains(err.Error(), "key not found") {
			if refreshErr := k.Refresh(); refreshErr != nil {
				return nil, err
			}
			token, err = jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				kid, _ := token.Header["kid"].(string)
				return k.getKey(kid), nil
			}, jwt.WithIssuer(k.expectedIssuer()), jwt.WithValidMethods([]string{"RS256"}))
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Verify azp (authorized party) matches our client if configured
	authClientID := config.Getenv("AUTH_CLIENT_ID", "")
	if authClientID != "" {
		azp, _ := claims["azp"].(string)
		if azp != "" && subtle.ConstantTimeCompare([]byte(azp), []byte(authClientID)) != 1 {
			return nil, fmt.Errorf("unauthorized client")
		}
	}

	return claims, nil
}

func parseRSAPublicKey(nB64, eB64 string) (interface{}, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nB64)
	if err != nil {
		return nil, fmt.Errorf("decode modulus: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eB64)
	if err != nil {
		return nil, fmt.Errorf("decode exponent: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := int(new(big.Int).SetBytes(eBytes).Int64())
	return &rsa.PublicKey{N: n, E: e}, nil
}
