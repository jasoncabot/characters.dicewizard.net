package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jasoncabot/dicewizard-characters/internal/models"
)

// CreateUser creates a new user.
func (s *Store) CreateUser(username, passwordHash string) (*models.User, error) {
	ctx := context.Background()

	u, err := s.q.CreateUser(ctx, CreateUserParams{Username: username, PasswordHash: passwordHash})
	if err != nil {
		if isUniqueConstraintError(err) {
			return nil, ErrUserExists
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	user := dbUserToModel(u)
	return &user, nil
}

// GetUserByUsername returns a user by username.
func (s *Store) GetUserByUsername(username string) (*models.User, error) {
	ctx := context.Background()

	u, err := s.q.GetUserByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	user := dbUserToModel(u)
	return &user, nil
}

// GetUserByID returns a user by ID.
func (s *Store) GetUserByID(id int64) (*models.User, error) {
	ctx := context.Background()

	u, err := s.q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	user := dbUserToModel(u)
	return &user, nil
}

func dbUserToModel(u User) models.User {
	return models.User{
		ID:           u.ID,
		Username:     u.Username,
		PasswordHash: u.PasswordHash,
		CreatedAt:    u.CreatedAt,
	}
}
