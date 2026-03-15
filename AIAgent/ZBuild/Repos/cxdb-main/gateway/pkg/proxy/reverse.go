// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

package proxy

import (
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

// ReverseProxy wraps httputil.ReverseProxy with additional configuration.
type ReverseProxy struct {
	proxy  *httputil.ReverseProxy
	target *url.URL
	logger *slog.Logger
}

// NewReverseProxy creates a reverse proxy to the specified backend URL.
func NewReverseProxy(backendURL string, logger *slog.Logger) (*ReverseProxy, error) {
	target, err := url.Parse(backendURL)
	if err != nil {
		return nil, err
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	// Custom director to set headers
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)

		// Set the host to the target
		req.Host = target.Host

		// Forward client IP
		clientIP := extractClientIP(req)
		if existing := req.Header.Get("X-Forwarded-For"); existing != "" {
			req.Header.Set("X-Forwarded-For", existing+", "+clientIP)
		} else {
			req.Header.Set("X-Forwarded-For", clientIP)
		}

		// Forward the original protocol
		if req.Header.Get("X-Forwarded-Proto") == "" {
			if req.TLS != nil {
				req.Header.Set("X-Forwarded-Proto", "https")
			} else {
				req.Header.Set("X-Forwarded-Proto", "http")
			}
		}

		// Forward the original host
		if req.Header.Get("X-Forwarded-Host") == "" {
			req.Header.Set("X-Forwarded-Host", req.Host)
		}
	}

	// Custom error handler
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		logger.Error("proxy error", "path", r.URL.Path, "method", r.Method, "err", err)
		http.Error(w, "Bad Gateway", http.StatusBadGateway)
	}

	// Custom transport with reasonable timeouts
	proxy.Transport = &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	return &ReverseProxy{
		proxy:  proxy,
		target: target,
		logger: logger,
	}, nil
}

// ServeHTTP implements http.Handler.
func (rp *ReverseProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	rp.proxy.ServeHTTP(w, r)
}

// Target returns the backend URL.
func (rp *ReverseProxy) Target() string {
	return rp.target.String()
}

func extractClientIP(r *http.Request) string {
	// Check X-Forwarded-For first (in case we're behind another proxy)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
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
