package store

import (
	"context"
	"fmt"
	"strings"
)

type NoteWithScore struct {
	Note
	Score *float64 `json:"score,omitempty"`
}

// CreateNote inserts a note and returns the created record.
func (s *Store) CreateNote(userID int64, entityType string, entityID *int64, title, body string) (*Note, error) {
	entityType = strings.TrimSpace(entityType)
	if entityType == "" {
		entityType = "general"
	}

	if strings.TrimSpace(body) == "" && strings.TrimSpace(title) == "" {
		return nil, fmt.Errorf("note content is required")
	}

	ctx := context.Background()
	inserted, err := s.q.InsertNote(ctx, InsertNoteParams{
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		Title:      title,
		Body:       body,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create note: %w", err)
	}

	return &Note{
		ID:         inserted.ID,
		UserID:     inserted.UserID,
		EntityType: inserted.EntityType,
		EntityID:   inserted.EntityID,
		Title:      inserted.Title,
		Body:       inserted.Body,
		CreatedAt:  inserted.CreatedAt,
		UpdatedAt:  inserted.UpdatedAt,
	}, nil
}
