package store

import (
	"database/sql"
	"errors"
	"fmt"

	_ "modernc.org/sqlite"
)

var ErrUserNotFound = errors.New("user not found")
var ErrUserExists = errors.New("username already exists")
var ErrCampaignNotFound = errors.New("campaign not found")
var ErrNotCampaignMember = errors.New("user is not a campaign member")
var ErrNotPermitted = errors.New("user is not permitted for this campaign")
var ErrCharacterNotOwned = errors.New("character not owned by user")
var ErrCampaignCharacterExists = errors.New("character already in campaign")
var ErrInvalidCampaignStatus = errors.New("invalid campaign status")
var ErrInviteNotFound = errors.New("invite not found")
var ErrInviteExpired = errors.New("invite expired")
var ErrInviteRedeemed = errors.New("invite already redeemed")
var ErrAlreadyMember = errors.New("user is already a member")
var ErrCampaignMapNotFound = errors.New("campaign map not found")
var ErrCampaignHandoutNotFound = errors.New("campaign handout not found")
var ErrTokenNotFound = errors.New("token not found")

// Store wraps the sqlc Queries with convenience helpers and API-facing models.
type Store struct {
	db *sql.DB
	q  *Queries
}

// NewStore creates a Store from an existing *sql.DB.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db, q: New(db)}
}

// NewFromPath opens a SQLite database at the given path and applies required pragmas.
func NewFromPath(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	pragmas := []string{
		"PRAGMA foreign_keys = ON",
		"PRAGMA journal_mode = WAL",
	}
	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			return nil, fmt.Errorf("failed to apply pragma %q: %w", pragma, err)
		}
	}

	return NewStore(db), nil
}

// DB exposes the underlying *sql.DB for migrations and diagnostics.
func (s *Store) DB() *sql.DB {
	return s.db
}

// Close closes the underlying DB connection.
func (s *Store) Close() error {
	return s.db.Close()
}
