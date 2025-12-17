package models

import "time"

// Note represents a user-authored note attached to any entity type.
type Note struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"userId"`
	EntityType string    `json:"entityType"`
	EntityID   *int64    `json:"entityId,omitempty"`
	Title      string    `json:"title"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	Score      *float64  `json:"score,omitempty"`
}

// CreateNoteRequest captures the payload for creating a note.
type CreateNoteRequest struct {
	EntityType string `json:"entityType"`
	EntityID   *int64 `json:"entityId,omitempty"`
	Title      string `json:"title"`
	Body       string `json:"body"`
}
