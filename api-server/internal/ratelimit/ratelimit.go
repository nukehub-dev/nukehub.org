// Package ratelimit implements the per-key request buckets used to rate
// limit public form endpoints, plus client-IP extraction and hashing.
package ratelimit

import (
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	window = time.Hour
	max    = 5
)

type entry struct {
	count     int
	resetTime time.Time
}

var (
	bucketStore = make(map[string]*entry)
	mu          sync.Mutex
)

// Allow reports whether the request identified by key is within its bucket
// limit (5 requests per hour), recording the attempt.
func Allow(key string) bool {
	now := time.Now()

	mu.Lock()
	defer mu.Unlock()

	e, exists := bucketStore[key]
	if !exists || now.After(e.resetTime) {
		bucketStore[key] = &entry{
			count:     1,
			resetTime: now.Add(window),
		}
		return true
	}

	if e.count >= max {
		return false
	}

	e.count++
	return true
}

// StartCleanup periodically removes stale bucket entries in the background.
func StartCleanup() {
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		for range ticker.C {
			now := time.Now()

			mu.Lock()
			for ip, e := range bucketStore {
				if now.After(e.resetTime) {
					delete(bucketStore, ip)
				}
			}
			mu.Unlock()
		}
	}()
}

// Reset clears every bucket. Test hook so tests do not leak rate-limit
// state into each other.
func Reset() {
	mu.Lock()
	defer mu.Unlock()
	bucketStore = make(map[string]*entry)
}

// ClientIP returns the client IP for rate limiting and hashing. Proxy
// headers are only trusted when the direct connection comes from a trusted
// source (loopback or private network). Otherwise a client can spoof
// X-Forwarded-For and bypass per-IP rate limits.
func ClientIP(r *http.Request) string {
	trustedProxy := false
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		if addr := net.ParseIP(host); addr != nil {
			trustedProxy = addr.IsLoopback() || addr.IsPrivate()
		}
	}

	ip := ""
	if trustedProxy {
		ip = r.Header.Get("X-Real-IP")
		if ip == "" {
			ip = r.Header.Get("X-Forwarded-For")
			if ip != "" {
				ip = strings.Split(ip, ",")[0]
				ip = strings.TrimSpace(ip)
			}
		}
	}

	if ip == "" {
		var err error
		ip, _, err = net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
	}
	return ip
}

// HashIP returns the hex SHA-256 of an IP for privacy-preserving storage.
func HashIP(ip string) string {
	h := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(h[:])
}
