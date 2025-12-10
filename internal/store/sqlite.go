package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jasoncabot/dicewizard-characters/internal/models"
	_ "modernc.org/sqlite"
)

var ErrUserNotFound = errors.New("user not found")
var ErrUserExists = errors.New("username already exists")

// Store provides database operations for characters
type Store struct {
	db *sql.DB
}

// New creates a new Store with the given database connection
func New(db *sql.DB) *Store {
	return &Store{db: db}
}

// NewFromPath creates a new Store by opening a SQLite database at the given path
func NewFromPath(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	// Enable WAL mode for better concurrent performance
	if _, err := db.Exec("PRAGMA journal_mode = WAL"); err != nil {
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}

	return &Store{db: db}, nil
}

// DB returns the underlying database connection
func (s *Store) DB() *sql.DB {
	return s.db
}

// Close closes the database connection
func (s *Store) Close() error {
	return s.db.Close()
}

// User operations

// CreateUser creates a new user
func (s *Store) CreateUser(username, passwordHash string) (*models.User, error) {
	result, err := s.db.Exec(
		"INSERT INTO users (username, password_hash) VALUES (?, ?)",
		username, passwordHash,
	)
	if err != nil {
		if isUniqueConstraintError(err) {
			return nil, ErrUserExists
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get user id: %w", err)
	}

	return &models.User{
		ID:        id,
		Username:  username,
		CreatedAt: time.Now(),
	}, nil
}

// GetUserByUsername returns a user by username
func (s *Store) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	err := s.db.QueryRow(
		"SELECT id, username, password_hash, created_at FROM users WHERE username = ?",
		username,
	).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

// GetUserByID returns a user by ID
func (s *Store) GetUserByID(id int64) (*models.User, error) {
	var user models.User
	err := s.db.QueryRow(
		"SELECT id, username, password_hash, created_at FROM users WHERE id = ?",
		id,
	).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func isUniqueConstraintError(err error) bool {
	return err != nil && (contains(err.Error(), "UNIQUE constraint failed") || contains(err.Error(), "unique constraint"))
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Character operations

// ListCharacters returns all characters for a user
func (s *Store) ListCharacters(userID int64) ([]*models.Character, error) {
	query := `
		SELECT id, user_id, name, race, class, level, background, alignment, experience_points,
			   strength, dexterity, constitution, intelligence, wisdom, charisma,
			   max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
			   skill_proficiencies, saving_throw_proficiencies, features, equipment, notes,
			   created_at, updated_at
		FROM characters
		WHERE user_id = ?
		ORDER BY updated_at DESC
	`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query characters: %w", err)
	}
	defer rows.Close()

	var characters []*models.Character
	for rows.Next() {
		c, err := scanCharacter(rows)
		if err != nil {
			return nil, err
		}
		c.ComputeModifiers()
		characters = append(characters, c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating characters: %w", err)
	}

	return characters, nil
}

// GetCharacter returns a character by ID for a specific user
func (s *Store) GetCharacter(id, userID int64) (*models.Character, error) {
	query := `
		SELECT id, user_id, name, race, class, level, background, alignment, experience_points,
			   strength, dexterity, constitution, intelligence, wisdom, charisma,
			   max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
			   skill_proficiencies, saving_throw_proficiencies, features, equipment, notes,
			   created_at, updated_at
		FROM characters
		WHERE id = ? AND user_id = ?
	`

	row := s.db.QueryRow(query, id, userID)
	c, err := scanCharacterRow(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get character: %w", err)
	}

	c.ComputeModifiers()
	return c, nil
}

// CreateCharacter creates a new character
func (s *Store) CreateCharacter(c *models.Character) error {
	query := `
		INSERT INTO characters (
			user_id, name, race, class, level, background, alignment, experience_points,
			strength, dexterity, constitution, intelligence, wisdom, charisma,
			max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
			skill_proficiencies, saving_throw_proficiencies, features, equipment, notes,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	result, err := s.db.Exec(query,
		c.UserID, c.Name, c.Race, c.Class, c.Level, c.Background, c.Alignment, c.ExperiencePoints,
		c.Strength, c.Dexterity, c.Constitution, c.Intelligence, c.Wisdom, c.Charisma,
		c.MaxHP, c.CurrentHP, c.TempHP, c.ArmorClass, c.Speed, c.HitDice,
		models.MarshalStringSlice(c.SkillProficiencies),
		models.MarshalStringSlice(c.SavingThrowProficiencies),
		models.MarshalStringSlice(c.Features),
		models.MarshalStringSlice(c.Equipment),
		c.Notes,
		c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create character: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %w", err)
	}

	c.ID = id
	c.ComputeModifiers()
	return nil
}

// UpdateCharacter updates an existing character
func (s *Store) UpdateCharacter(c *models.Character) error {
	query := `
		UPDATE characters SET
			name = ?, race = ?, class = ?, level = ?, background = ?, alignment = ?, experience_points = ?,
			strength = ?, dexterity = ?, constitution = ?, intelligence = ?, wisdom = ?, charisma = ?,
			max_hp = ?, current_hp = ?, temp_hp = ?, armor_class = ?, speed = ?, hit_dice = ?,
			skill_proficiencies = ?, saving_throw_proficiencies = ?, features = ?, equipment = ?, notes = ?,
			updated_at = ?
		WHERE id = ? AND user_id = ?
	`

	c.UpdatedAt = time.Now()

	result, err := s.db.Exec(query,
		c.Name, c.Race, c.Class, c.Level, c.Background, c.Alignment, c.ExperiencePoints,
		c.Strength, c.Dexterity, c.Constitution, c.Intelligence, c.Wisdom, c.Charisma,
		c.MaxHP, c.CurrentHP, c.TempHP, c.ArmorClass, c.Speed, c.HitDice,
		models.MarshalStringSlice(c.SkillProficiencies),
		models.MarshalStringSlice(c.SavingThrowProficiencies),
		models.MarshalStringSlice(c.Features),
		models.MarshalStringSlice(c.Equipment),
		c.Notes,
		c.UpdatedAt,
		c.ID,
		c.UserID,
	)
	if err != nil {
		return fmt.Errorf("failed to update character: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("character not found")
	}

	c.ComputeModifiers()
	return nil
}

// DeleteCharacter deletes a character by ID for a specific user
func (s *Store) DeleteCharacter(id, userID int64) error {
	query := `DELETE FROM characters WHERE id = ? AND user_id = ?`

	result, err := s.db.Exec(query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete character: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("character not found")
	}

	return nil
}

// scanCharacter scans a character from a rows result
func scanCharacter(rows *sql.Rows) (*models.Character, error) {
	var c models.Character
	var skillProf, saveProf, features, equipment string

	err := rows.Scan(
		&c.ID, &c.UserID, &c.Name, &c.Race, &c.Class, &c.Level, &c.Background, &c.Alignment, &c.ExperiencePoints,
		&c.Strength, &c.Dexterity, &c.Constitution, &c.Intelligence, &c.Wisdom, &c.Charisma,
		&c.MaxHP, &c.CurrentHP, &c.TempHP, &c.ArmorClass, &c.Speed, &c.HitDice,
		&skillProf, &saveProf, &features, &equipment, &c.Notes,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan character: %w", err)
	}

	c.SkillProficiencies = models.UnmarshalStringSlice(skillProf)
	c.SavingThrowProficiencies = models.UnmarshalStringSlice(saveProf)
	c.Features = models.UnmarshalStringSlice(features)
	c.Equipment = models.UnmarshalStringSlice(equipment)

	return &c, nil
}

// scanCharacterRow scans a character from a single row result
func scanCharacterRow(row *sql.Row) (*models.Character, error) {
	var c models.Character
	var skillProf, saveProf, features, equipment string

	err := row.Scan(
		&c.ID, &c.UserID, &c.Name, &c.Race, &c.Class, &c.Level, &c.Background, &c.Alignment, &c.ExperiencePoints,
		&c.Strength, &c.Dexterity, &c.Constitution, &c.Intelligence, &c.Wisdom, &c.Charisma,
		&c.MaxHP, &c.CurrentHP, &c.TempHP, &c.ArmorClass, &c.Speed, &c.HitDice,
		&skillProf, &saveProf, &features, &equipment, &c.Notes,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	c.SkillProficiencies = models.UnmarshalStringSlice(skillProf)
	c.SavingThrowProficiencies = models.UnmarshalStringSlice(saveProf)
	c.Features = models.UnmarshalStringSlice(features)
	c.Equipment = models.UnmarshalStringSlice(equipment)

	return &c, nil
}
