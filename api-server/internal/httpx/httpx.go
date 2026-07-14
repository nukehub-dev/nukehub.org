// Package httpx holds shared HTTP helpers: JSON responses, input
// sanitization, and the middleware chain applied to every request.
package httpx

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
)

// MaxRequestBodyBytes caps JSON request bodies at 2 MiB.
const MaxRequestBodyBytes = 2 << 20 // 2 MiB

// EmailRegex validates email addresses on public form endpoints.
var EmailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// SourceRegex restricts the optional subscription source to lowercase
// alphanumeric, hyphens, and underscores (1-50 chars).
var SourceRegex = regexp.MustCompile(`^[a-z0-9_-]{1,50}$`)

// JSON writes data as a JSON response with the given status code.
func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// SanitizeInput trims whitespace and strips NUL and control characters
// (except newline and tab) from user input.
func SanitizeInput(input string) string {
	input = strings.TrimSpace(input)
	input = strings.ReplaceAll(input, "\x00", "")
	// Remove control characters except newline and tab
	var result strings.Builder
	for _, r := range input {
		if (r >= 0x00 && r <= 0x08) || (r >= 0x0B && r <= 0x0C) || (r >= 0x0E && r <= 0x1F) || r == 0x7F {
			continue
		}
		result.WriteRune(r)
	}
	return result.String()
}

// SanitizeHeader strips CR/LF to prevent email header injection.
func SanitizeHeader(input string) string {
	input = strings.ReplaceAll(input, "\r", "")
	input = strings.ReplaceAll(input, "\n", "")
	return input
}

// NormalizeSource coerces an optional subscription source into a safe,
// lowercase token. Unusable values fall back to "newsletter".
func NormalizeSource(source string) string {
	source = strings.ToLower(SanitizeInput(source))
	if SourceRegex.MatchString(source) {
		return source
	}
	return "newsletter"
}

// LastSegment returns the final slash-separated segment of a path.
func LastSegment(path string) string {
	parts := strings.Split(path, "/")
	return parts[len(parts)-1]
}
