// Package turnstile verifies Cloudflare Turnstile tokens.
package turnstile

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// Verify checks a Turnstile token against the Cloudflare siteverify
// endpoint. Reads TURNSTILE_SECRET_KEY at call time; fails closed when it
// is unset.
func Verify(token, remoteIP string) bool {
	secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	if secretKey == "" {
		fmt.Fprintf(os.Stderr, "Turnstile secret key not configured\n")
		return false
	}

	payloadMap := map[string]string{
		"secret":   secretKey,
		"response": token,
	}
	if remoteIP != "" {
		payloadMap["remoteip"] = remoteIP
	}
	payload, _ := json.Marshal(payloadMap)

	resp, err := http.Post(
		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		"application/json",
		bytes.NewBuffer(payload),
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Turnstile verification error: %v\n", err)
		return false
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false
	}

	return result.Success
}
