// Package testutil provides shared test fixtures as importable helpers:
// a temp database, fake SMTP and IMAP servers, and a stub Keycloak JWKS
// issuer for admin-role tests. Regular (non _test.go) files so every
// package's tests can use them.
package testutil

import (
	"testing"

	"nukehub-api/internal/ratelimit"
	"nukehub-api/internal/store"
)

// TempDB opens a fresh temp database and resets per-process state so
// tests do not leak into each other.
func TempDB(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_PATH", t.TempDir()+"/test.db")
	if err := store.Open(); err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	t.Cleanup(func() { store.DB.Close() })

	ratelimit.Reset()
}
