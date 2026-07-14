// Package store owns the SQLite database handle and schema.
package store

import (
	"database/sql"
	"fmt"
	"os"
	"strings"
	"sync"

	_ "modernc.org/sqlite"

	"nukehub-api/internal/config"
	"nukehub-api/internal/httpx"
)

// DB is the process-wide database handle, set by Open.
var DB *sql.DB

var (
	dbInit    sync.Once
	dbInitErr error
)

// Open opens (creating if needed) the database at DATABASE_PATH, applies the
// schema, and runs pending migrations. Safe to call repeatedly, e.g. from
// tests that point DATABASE_PATH at a fresh temp file.
func Open() error {
	dbPath := config.Getenv("DATABASE_PATH", "./data/nukehub.db")
	dir := strings.TrimSuffix(dbPath, "/"+httpx.LastSegment(dbPath))
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return fmt.Errorf("create database directory: %w", err)
		}
	}

	var err error
	DB, err = sql.Open("sqlite", dbPath+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)")
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	// The SQLite pool is capped at one connection. Never run a query while
	// iterating an open Rows — the nested query waits for the only
	// connection and deadlocks the handler. Collect the rows, close, then
	// run further queries.
	DB.SetMaxOpenConns(1)

	if err := DB.Ping(); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	schema := `
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_slug TEXT NOT NULL,
    survey_title TEXT NOT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_hash TEXT,
    email TEXT
);

CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    question_id TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_hash TEXT,
    source TEXT DEFAULT 'newsletter'
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_submissions_slug ON submissions(survey_slug);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_responses_submission_id ON responses(submission_id);

CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    from_email TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    source TEXT NOT NULL DEFAULT 'manual',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    finished_at DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    sent_at DATETIME,
    UNIQUE (campaign_id, email),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deliveries_campaign_status ON deliveries(campaign_id, status);
`
	if _, err := DB.Exec(schema); err != nil {
		return fmt.Errorf("create schema: %w", err)
	}

	// Migration: campaigns.source was added after the table first shipped.
	var hasSource bool
	rows, err := DB.Query("PRAGMA table_info(campaigns)")
	if err != nil {
		return fmt.Errorf("inspect campaigns table: %w", err)
	}
	for rows.Next() {
		var cid int
		var name, ctype string
		var notNull, pk int
		var dflt interface{}
		if err := rows.Scan(&cid, &name, &ctype, &notNull, &dflt, &pk); err != nil {
			rows.Close()
			return fmt.Errorf("inspect campaigns table: %w", err)
		}
		if name == "source" {
			hasSource = true
		}
	}
	rows.Close()
	if !hasSource {
		if _, err := DB.Exec("ALTER TABLE campaigns ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'"); err != nil {
			return fmt.Errorf("add campaigns.source column: %w", err)
		}
	}
	return nil
}

// OpenOnce runs Open at most once per process and returns the first result.
// Used by main; tests call Open directly.
func OpenOnce() error {
	dbInit.Do(func() {
		dbInitErr = Open()
	})
	return dbInitErr
}
