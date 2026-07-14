// Package config provides environment variable helpers.
package config

import "os"

// Getenv returns the value of the environment variable key, or
// defaultValue when it is unset or empty.
func Getenv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
