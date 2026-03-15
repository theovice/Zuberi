// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

package auth

import (
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

// BearerTokenVerifier validates bearer tokens and returns a session.
// Implemented by K8sOIDCVerifier and AWSTokenExchanger.
type BearerTokenVerifier interface {
	Verify(token string) (*Session, error)
}

// Debug auth bypass configuration (set via environment variables)
// DEBUG_AUTH_TOKEN: Static token for Authorization header (e.g., "Bearer debug-token-123")
// DEBUG_AUTH_ALLOWED_IPS: Comma-separated list of allowed IPs (e.g., "107.131.127.143,10.0.0.1")
var (
	debugAuthToken      = os.Getenv("DEBUG_AUTH_TOKEN")
	debugAuthAllowedIPs = parseAllowedIPs(os.Getenv("DEBUG_AUTH_ALLOWED_IPS"))
)

func parseAllowedIPs(s string) map[string]bool {
	ips := make(map[string]bool)
	for _, ip := range strings.Split(s, ",") {
		ip = strings.TrimSpace(ip)
		if ip != "" {
			ips[ip] = true
		}
	}
	return ips
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (set by ALB/proxy)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	// Fall back to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// checkDebugAuth checks if the request has a valid debug Authorization header
// from an allowed IP address. Returns a debug session if valid, nil otherwise.
func checkDebugAuth(r *http.Request) *Session {
	if debugAuthToken == "" {
		return nil // Debug auth not configured
	}

	// Check Authorization header
	auth := r.Header.Get("Authorization")
	if auth != debugAuthToken {
		return nil
	}

	// Check IP allowlist
	clientIP := getClientIP(r)
	if !debugAuthAllowedIPs[clientIP] {
		log.Printf("[auth] DEBUG_AUTH_TOKEN matched but IP %s not in allowlist", clientIP)
		return nil
	}

	log.Printf("[auth] debug auth bypass granted for IP %s", clientIP)
	return &Session{
		ID:        "debug-auth-session",
		Email:     "debug@localhost",
		Name:      "Debug Auth User",
		CreatedAt: time.Now().UTC(),
		ExpiresAt: time.Now().Add(24 * time.Hour).UTC(),
	}
}

// AuthMiddlewareOptions configures the auth middleware.
type AuthMiddlewareOptions struct {
	Store          *SessionStore
	DevBypass      bool
	TokenVerifiers []BearerTokenVerifier // Optional: K8s OIDC, AWS IAM, etc.
}

// RequireAuthForReads is an HTTP middleware that enforces a valid session for
// all GET requests except explicitly whitelisted paths. Non-GET methods (writes)
// are always allowed through without authentication.
func RequireAuthForReads(store *SessionStore, next http.Handler, devBypass bool) http.Handler {
	return RequireAuthForReadsWithOptions(AuthMiddlewareOptions{
		Store:     store,
		DevBypass: devBypass,
	}, next)
}

// RequireAuthForReadsWithOptions is like RequireAuthForReads but with additional options.
func RequireAuthForReadsWithOptions(opts AuthMiddlewareOptions, next http.Handler) http.Handler {
	store := opts.Store

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Always allow non-GET methods (anonymous writes)
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if store.Debug() {
				log.Printf("[auth] allowing write method %s %s", r.Method, path)
			}
			next.ServeHTTP(w, r)
			return
		}

		// Always allow public paths
		if isPublicPath(path) {
			if store.Debug() {
				log.Printf("[auth] public path %s", path)
			}
			next.ServeHTTP(w, r)
			return
		}

		sess, _ := store.SessionFromRequest(r.Context(), r)

		// Try bearer token authentication (K8s OIDC, AWS IAM, etc.)
		if sess == nil {
			if token := extractBearerToken(r); token != "" {
				for _, verifier := range opts.TokenVerifiers {
					if s, err := verifier.Verify(token); err == nil && s != nil {
						sess = s
						if store.Debug() {
							log.Printf("[auth] bearer token verified: %s", s.Email)
						}
						break
					}
				}
			}
		}

		// Check for debug auth bypass (static token from allowed IP)
		if sess == nil {
			sess = checkDebugAuth(r)
		}

		// In DEV_MODE, allow requests without a browser session by
		// injecting a synthetic user. This is only enabled when the
		// server is started with DEV_MODE=true and PublicBaseURL is
		// pointing at localhost.
		if sess == nil && opts.DevBypass {
			if store.Debug() {
				log.Printf("[auth] DEV_MODE enabled, injecting dev session for %s", path)
			}
			email := strings.TrimSpace(os.Getenv("DEV_EMAIL"))
			if email == "" {
				email = "dev@localhost"
			}
			name := strings.TrimSpace(os.Getenv("DEV_NAME"))
			if name == "" {
				name = "Dev Mode User"
			}
			sess = &Session{
				ID:        "dev-mode-session",
				Email:     email,
				Name:      name,
				CreatedAt: time.Now().UTC(),
				ExpiresAt: time.Now().Add(store.TTL()).UTC(),
			}
		}

		if sess == nil {
			// For API requests, return 401 instead of redirect
			if isAPIRequest(r) {
				if store.Debug() {
					log.Printf("[auth] returning 401 for API request %s", path)
				}
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			if store.Debug() {
				log.Printf("[auth] redirecting to /login from %s", path)
			}
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		if store.Debug() {
			log.Printf("[auth] authorized %s as %s", path, sess.Email)
		}
		ctx := WithUser(r.Context(), sess)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// extractBearerToken extracts a bearer token from the Authorization header.
func extractBearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

// isAPIRequest returns true if the request appears to be an API request
// (should get 401 instead of redirect on auth failure).
func isAPIRequest(r *http.Request) bool {
	// Check for explicit API path
	if strings.HasPrefix(r.URL.Path, "/v1/") || strings.HasPrefix(r.URL.Path, "/api/") {
		return true
	}
	// Check for Authorization header (service-to-service)
	if r.Header.Get("Authorization") != "" {
		return true
	}
	// Check Accept header for JSON
	accept := r.Header.Get("Accept")
	if strings.Contains(accept, "application/json") && !strings.Contains(accept, "text/html") {
		return true
	}
	return false
}

func isPublicPath(path string) bool {
	path = strings.ToLower(path)

	// Health checks and login page
	if path == "/healthz" || path == "/readyz" || path == "/favicon.ico" || path == "/login" {
		return true
	}
	// OAuth flow
	if strings.HasPrefix(path, "/auth/") {
		return true
	}
	// Static assets required to render the login page (Next.js static export)
	if strings.HasPrefix(path, "/_next/") || strings.HasPrefix(path, "/static/") {
		return true
	}
	if strings.HasSuffix(path, ".css") || strings.HasSuffix(path, ".js") || strings.HasSuffix(path, ".ico") {
		return true
	}
	// Context list endpoint (just IDs, no bodies) - allow anonymous reads
	// Note: r.URL.Path doesn't include query string, so /v1/contexts?limit=5 has path="/v1/contexts"
	// But NOT /v1/contexts/{id} or /v1/contexts/{id}/turns - those require auth
	if path == "/v1/contexts" {
		return true
	}
	// Metrics endpoint - needed for dashboard and monitoring systems
	// Only exposes aggregate system stats, no sensitive user data
	if path == "/v1/metrics" {
		return true
	}
	// SSE events endpoint - notifications about context/turn changes
	// No sensitive data, just IDs and timestamps
	if path == "/v1/events" {
		return true
	}
	return false
}
