// Copyright 2025 StrongDM Inc
// SPDX-License-Identifier: Apache-2.0

package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Session captures the authenticated user for a browser.
type Session struct {
	ID        string
	Email     string
	Name      string
	Picture   string
	CreatedAt time.Time
	ExpiresAt time.Time
}

// SessionStore handles persistence of sessions in SQLite and
// issuing/clearing the browser cookie.
type SessionStore struct {
	db         *sql.DB
	ttl        time.Duration
	cookieName string
	domain     string
	secure     bool
	secret     []byte
	debug      bool
}

func NewSessionStore(databasePath, cookieName string, ttl time.Duration, cookieDomain string, secure bool, secret string) (*SessionStore, error) {
	if err := os.MkdirAll(filepath.Dir(databasePath), 0o755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	db, err := sql.Open("sqlite3", databasePath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// Enable WAL mode for better durability in single-writer scenarios
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, fmt.Errorf("enable WAL mode: %w", err)
	}

	store := &SessionStore{
		db:         db,
		ttl:        ttl,
		cookieName: cookieName,
		domain:     strings.TrimSpace(cookieDomain),
		secure:     secure,
		secret:     []byte(secret),
		debug:      strings.Contains(os.Getenv("DEBUG"), "auth") || strings.Contains(os.Getenv("DEBUG"), "all"),
	}
	if err := store.ensureSchema(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *SessionStore) ensureSchema() error {
	const schema = `
	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		email TEXT NOT NULL,
		name TEXT,
		picture TEXT,
		created_at TIMESTAMP NOT NULL,
		expires_at TIMESTAMP NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);
	`
	if _, err := s.db.Exec(schema); err != nil {
		return fmt.Errorf("init schema: %w", err)
	}
	// Backfill for older schemas missing the picture column; ignore duplicate errors.
	_, _ = s.db.Exec(`ALTER TABLE sessions ADD COLUMN picture TEXT;`)
	return nil
}

// Create inserts a new session and returns its ID.
func (s *SessionStore) Create(ctx context.Context, email, name, picture string) (string, error) {
	id, err := randomID()
	if err != nil {
		return "", err
	}
	now := time.Now().UTC()
	expires := now.Add(s.ttl)
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO sessions (id, email, name, picture, created_at, expires_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, id, email, name, picture, now, expires)
	if err != nil {
		return "", fmt.Errorf("insert session: %w", err)
	}
	return id, nil
}

// Get returns a valid, non-expired session by ID.
func (s *SessionStore) Get(ctx context.Context, id string) (*Session, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, email, name, picture, created_at, expires_at
		FROM sessions
		WHERE id = ?
	`, id)

	var sess Session
	if err := row.Scan(&sess.ID, &sess.Email, &sess.Name, &sess.Picture, &sess.CreatedAt, &sess.ExpiresAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("select session: %w", err)
	}
	if time.Now().After(sess.ExpiresAt) {
		_ = s.Delete(ctx, id)
		return nil, nil
	}
	return &sess, nil
}

// Delete removes a session by ID.
func (s *SessionStore) Delete(ctx context.Context, id string) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE id = ?`, id); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// Close closes the underlying database handle.
func (s *SessionStore) Close() error {
	return s.db.Close()
}

// Ping verifies the underlying SQLite database is reachable.
func (s *SessionStore) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

// SessionFromRequest fetches the session for the incoming HTTP request.
func (s *SessionStore) SessionFromRequest(ctx context.Context, r *http.Request) (*Session, error) {
	cookie, err := r.Cookie(s.cookieName)
	if err != nil {
		if s.debug {
			log.Printf("[auth] no session cookie on %s", r.URL.Path)
		}
		return nil, nil
	}
	value := strings.TrimSpace(cookie.Value)
	value, ok := s.verify(value)
	if !ok {
		if s.debug {
			log.Printf("[auth] bad signature for cookie on %s", r.URL.Path)
		}
		return nil, nil
	}
	if value == "" {
		if s.debug {
			log.Printf("[auth] empty cookie on %s", r.URL.Path)
		}
		return nil, nil
	}
	if s.debug {
		log.Printf("[auth] checking session %s", value)
	}
	return s.Get(ctx, value)
}

// SetCookie writes the session cookie using security best practices.
func (s *SessionStore) SetCookie(w http.ResponseWriter, sessionID string) {
	signed := s.sign(sessionID)
	http.SetCookie(w, &http.Cookie{
		Name:     s.cookieName,
		Value:    signed,
		Domain:   s.domain,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
	})
}

// ClearCookie removes the session cookie from the browser.
func (s *SessionStore) ClearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     s.cookieName,
		Value:    "",
		Domain:   s.domain,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

// Domain returns the cookie domain for this session store.
func (s *SessionStore) Domain() string {
	return s.domain
}

// Secure returns whether cookies are marked secure.
func (s *SessionStore) Secure() bool {
	return s.secure
}

// TTL returns the session time-to-live.
func (s *SessionStore) TTL() time.Duration {
	return s.ttl
}

// Debug returns whether debug logging is enabled.
func (s *SessionStore) Debug() bool {
	return s.debug
}

func randomID() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("rand: %w", err)
	}
	return hex.EncodeToString(b[:]), nil
}

func (s *SessionStore) sign(value string) string {
	h := hmac.New(sha256.New, s.secret)
	h.Write([]byte(value))
	return value + "." + hex.EncodeToString(h.Sum(nil))
}

func (s *SessionStore) verify(raw string) (string, bool) {
	parts := strings.Split(raw, ".")
	if len(parts) < 2 {
		return "", false
	}
	value := strings.Join(parts[:len(parts)-1], ".")
	sig := parts[len(parts)-1]

	expected := s.sign(value)
	return value, subtleEqual(expected, raw) && subtleEqual(sig, expected[strings.LastIndex(expected, ".")+1:])
}

func subtleEqual(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	var diff byte
	for i := 0; i < len(a); i++ {
		diff |= a[i] ^ b[i]
	}
	return diff == 0
}
