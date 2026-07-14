package auth

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"nukehub-api/internal/config"
	"nukehub-api/internal/httpx"
)

// RequireRole gates a handler on a single client role.
func RequireRole(role string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return RequireAnyRole(role)(next)
	}
}

// RequireAnyRole verifies the bearer token against Default and requires at
// least one of the given client roles under AUTH_CLIENT_ID.
func RequireAnyRole(roles ...string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			authClientID := config.Getenv("AUTH_CLIENT_ID", "")
			if authClientID == "" {
				httpx.JSON(w, http.StatusForbidden, map[string]interface{}{"error": "Auth client ID not configured"})
				return
			}
			if Default == nil {
				httpx.JSON(w, http.StatusForbidden, map[string]interface{}{"error": "Auth not configured"})
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				httpx.JSON(w, http.StatusUnauthorized, map[string]interface{}{"error": "Authorization required"})
				return
			}
			token := strings.TrimPrefix(authHeader, "Bearer ")

			claims, err := Default.VerifyToken(token)
			if err != nil {
				httpx.JSON(w, http.StatusUnauthorized, map[string]interface{}{"error": err.Error()})
				return
			}

			for _, role := range roles {
				if HasClientRole(claims, authClientID, role) {
					next(w, r)
					return
				}
			}

			httpx.JSON(w, http.StatusForbidden, map[string]interface{}{"error": "Access denied"})
		}
	}
}

// HasClientRole reports whether the claims carry the role under the
// resource_access entry for clientID.
func HasClientRole(claims jwt.MapClaims, clientID, role string) bool {
	resourceAccess, ok := claims["resource_access"].(map[string]interface{})
	if !ok {
		return false
	}
	clientAccess, ok := resourceAccess[clientID].(map[string]interface{})
	if !ok {
		return false
	}
	roles, ok := clientAccess["roles"].([]interface{})
	if !ok {
		return false
	}
	for _, r := range roles {
		if s, ok := r.(string); ok && s == role {
			return true
		}
	}
	return false
}
