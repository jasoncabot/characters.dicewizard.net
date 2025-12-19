package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jasoncabot/dicewizard-characters/internal/models"
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
		       avatar_url, created_at, updated_at
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
		       avatar_url, created_at, updated_at
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
			avatar_url, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
		c.AvatarURL,
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

// UpdateCharacterAvatar sets the avatar URL for a character owned by the user.
func (s *Store) UpdateCharacterAvatar(id, userID int64, avatarURL string) (*models.Character, error) {
	query := `UPDATE characters SET avatar_url = ?, updated_at = ? WHERE id = ? AND user_id = ?`

	result, err := s.db.Exec(query, avatarURL, time.Now(), id, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to update character avatar: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return nil, fmt.Errorf("character not found")
	}

	return s.GetCharacter(id, userID)
}

// scanCharacter scans a character from a rows result
func scanCharacter(rows *sql.Rows) (*models.Character, error) {
	var c models.Character
	var skillProf, saveProf, features, equipment, avatarURL string

	err := rows.Scan(
		&c.ID, &c.UserID, &c.Name, &c.Race, &c.Class, &c.Level, &c.Background, &c.Alignment, &c.ExperiencePoints,
		&c.Strength, &c.Dexterity, &c.Constitution, &c.Intelligence, &c.Wisdom, &c.Charisma,
		&c.MaxHP, &c.CurrentHP, &c.TempHP, &c.ArmorClass, &c.Speed, &c.HitDice,
		&skillProf, &saveProf, &features, &equipment, &c.Notes,
		&avatarURL, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan character: %w", err)
	}

	c.SkillProficiencies = models.UnmarshalStringSlice(skillProf)
	c.SavingThrowProficiencies = models.UnmarshalStringSlice(saveProf)
	c.Features = models.UnmarshalStringSlice(features)
	c.Equipment = models.UnmarshalStringSlice(equipment)
	c.AvatarURL = avatarURL

	return &c, nil
}

// scanCharacterRow scans a character from a single row result
func scanCharacterRow(row *sql.Row) (*models.Character, error) {
	var c models.Character
	var skillProf, saveProf, features, equipment, avatarURL string

	err := row.Scan(
		&c.ID, &c.UserID, &c.Name, &c.Race, &c.Class, &c.Level, &c.Background, &c.Alignment, &c.ExperiencePoints,
		&c.Strength, &c.Dexterity, &c.Constitution, &c.Intelligence, &c.Wisdom, &c.Charisma,
		&c.MaxHP, &c.CurrentHP, &c.TempHP, &c.ArmorClass, &c.Speed, &c.HitDice,
		&skillProf, &saveProf, &features, &equipment, &c.Notes,
		&avatarURL, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	c.SkillProficiencies = models.UnmarshalStringSlice(skillProf)
	c.SavingThrowProficiencies = models.UnmarshalStringSlice(saveProf)
	c.Features = models.UnmarshalStringSlice(features)
	c.Equipment = models.UnmarshalStringSlice(equipment)
	c.AvatarURL = avatarURL

	return &c, nil
}

// Campaign operations

// CreateCampaign creates a campaign and records the owner membership.
func (s *Store) CreateCampaign(ownerID int64, name, description, visibility, status string) (*models.Campaign, error) {
	if name == "" {
		return nil, fmt.Errorf("campaign name is required")
	}

	if visibility == "" {
		visibility = models.CampaignVisibilityPrivate
	}

	if visibility != models.CampaignVisibilityPrivate && visibility != models.CampaignVisibilityInvite {
		return nil, fmt.Errorf("invalid visibility")
	}

	if status == "" {
		status = models.CampaignStatusNotStarted
	}

	if !isValidCampaignStatus(status) {
		return nil, fmt.Errorf("invalid status")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now()
	res, err := tx.Exec(
		`INSERT INTO campaigns (owner_id, name, description, visibility, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		ownerID, name, description, visibility, status, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create campaign: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign id: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO campaign_members (campaign_id, user_id, role, status, invited_by, created_at) VALUES (?, ?, 'owner', 'accepted', NULL, ?)`,
		id, ownerID, now,
	); err != nil {
		return nil, fmt.Errorf("failed to add owner membership: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit campaign creation: %w", err)
	}

	return &models.Campaign{
		ID:          id,
		OwnerID:     ownerID,
		Name:        name,
		Description: description,
		Visibility:  visibility,
		Status:      status,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// ListCampaigns returns campaigns a user belongs to (accepted membership).
func (s *Store) ListCampaigns(userID int64) ([]*models.Campaign, error) {
	rows, err := s.db.Query(
		`SELECT c.id, c.owner_id, c.name, c.description, c.visibility, c.status, c.created_at, c.updated_at
		 FROM campaigns c
		 INNER JOIN campaign_members m ON m.campaign_id = c.id
		 WHERE m.user_id = ? AND m.status = 'accepted'
		 ORDER BY c.updated_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaigns: %w", err)
	}
	defer rows.Close()

	var campaigns []*models.Campaign
	for rows.Next() {
		c, err := scanCampaign(rows)
		if err != nil {
			return nil, err
		}
		campaigns = append(campaigns, c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating campaigns: %w", err)
	}

	return campaigns, nil
}

// UpdateCampaign allows an owner/editor to change campaign fields.
func (s *Store) UpdateCampaign(campaignID, userID int64, name, description, visibility, status string) (*models.Campaign, error) {
	if visibility != "" && visibility != models.CampaignVisibilityPrivate && visibility != models.CampaignVisibilityInvite {
		return nil, fmt.Errorf("invalid visibility")
	}
	if status != "" && !isValidCampaignStatus(status) {
		return nil, ErrInvalidCampaignStatus
	}

	role, memberStatus, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if memberStatus != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	current, err := s.getCampaignByID(campaignID)
	if err != nil {
		return nil, err
	}

	if name == "" {
		name = current.Name
	}
	if description == "" {
		description = current.Description
	}
	if visibility == "" {
		visibility = current.Visibility
	}
	if status == "" {
		status = current.Status
	}

	now := time.Now()
	if _, err := s.db.Exec(
		`UPDATE campaigns SET name = ?, description = ?, visibility = ?, status = ?, updated_at = ? WHERE id = ?`,
		name, description, visibility, status, now, campaignID,
	); err != nil {
		return nil, fmt.Errorf("failed to update campaign: %w", err)
	}

	current.Name = name
	current.Description = description
	current.Visibility = visibility
	current.Status = status
	current.UpdatedAt = now
	return current, nil
}

// UpdateCampaignStatus updates only the status of a campaign with permissions.
func (s *Store) UpdateCampaignStatus(campaignID, userID int64, status string) (*models.Campaign, error) {
	if !isValidCampaignStatus(status) {
		return nil, ErrInvalidCampaignStatus
	}

	role, memberStatus, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if memberStatus != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	current, err := s.getCampaignByID(campaignID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if _, err := s.db.Exec(`UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?`, status, now, campaignID); err != nil {
		return nil, fmt.Errorf("failed to update campaign status: %w", err)
	}

	current.Status = status
	current.UpdatedAt = now
	return current, nil
}

// AddCharacterToCampaign attaches a user's character to a campaign after membership and ownership checks.
func (s *Store) AddCharacterToCampaign(campaignID, characterID, userID int64) (*models.CampaignCharacter, error) {
	// Ensure campaign exists
	if _, err := s.getCampaignOwner(campaignID); err != nil {
		return nil, err
	}

	role, status, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if status != "accepted" {
		return nil, ErrNotPermitted
	}
	if role != "owner" && role != "editor" {
		return nil, ErrNotPermitted
	}

	if owned, err := s.characterOwnedByUser(characterID, userID); err != nil {
		return nil, err
	} else if !owned {
		return nil, ErrCharacterNotOwned
	}

	now := time.Now()
	res, err := s.db.Exec(
		`INSERT INTO campaign_characters (campaign_id, character_id, created_at) VALUES (?, ?, ?)`,
		campaignID, characterID, now,
	)
	if err != nil {
		if isUniqueConstraintError(err) {
			return nil, ErrCampaignCharacterExists
		}
		return nil, fmt.Errorf("failed to add character to campaign: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign_character id: %w", err)
	}

	return &models.CampaignCharacter{
		ID:          id,
		CampaignID:  campaignID,
		CharacterID: characterID,
		CreatedAt:   now,
	}, nil
}

// CreateCampaignInvite generates an invite code for a campaign.
func (s *Store) CreateCampaignInvite(campaignID, userID int64, roleDefault string, expiresAt time.Time) (*models.CampaignInvite, error) {
	if roleDefault == "" {
		roleDefault = "viewer"
	}
	if roleDefault != "viewer" && roleDefault != "editor" {
		return nil, fmt.Errorf("invalid role default")
	}
	if expiresAt.Before(time.Now()) {
		expiresAt = time.Now().Add(7 * 24 * time.Hour)
	}

	role, memberStatus, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if memberStatus != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	code, err := s.generateUniqueInviteCode()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	res, err := s.db.Exec(
		`INSERT INTO campaign_invites (campaign_id, code, invited_by, role_default, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		campaignID, code, userID, roleDefault, expiresAt, now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create invite: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get invite id: %w", err)
	}

	return &models.CampaignInvite{
		ID:          id,
		CampaignID:  campaignID,
		Code:        code,
		InvitedBy:   userID,
		RoleDefault: roleDefault,
		Status:      "active",
		ExpiresAt:   expiresAt,
		CreatedAt:   now,
	}, nil
}

// AcceptInvite redeems an invite code and creates/updates membership.
func (s *Store) AcceptInvite(code string, userID int64) (*models.Campaign, error) {
	var inv models.CampaignInvite
	var redeemedBy sql.NullInt64
	var redeemedAt sql.NullTime

	row := s.db.QueryRow(
		`SELECT id, campaign_id, code, invited_by, role_default, status, expires_at, redeemed_by, redeemed_at, created_at
		 FROM campaign_invites WHERE code = ?`, code)

	if err := row.Scan(&inv.ID, &inv.CampaignID, &inv.Code, &inv.InvitedBy, &inv.RoleDefault, &inv.Status, &inv.ExpiresAt, &redeemedBy, &redeemedAt, &inv.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrInviteNotFound
		}
		return nil, fmt.Errorf("failed to load invite: %w", err)
	}

	if inv.Status != "active" {
		return nil, ErrInviteRedeemed
	}
	if time.Now().After(inv.ExpiresAt) {
		return nil, ErrInviteExpired
	}
	if redeemedBy.Valid {
		return nil, ErrInviteRedeemed
	}

	// Already member?
	_, status, err := s.getMembership(inv.CampaignID, userID)
	if err != nil && !errors.Is(err, ErrNotCampaignMember) {
		return nil, err
	}
	if err == nil && status == "accepted" {
		return nil, ErrAlreadyMember
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now()
	if _, err := tx.Exec(`UPDATE campaign_invites SET redeemed_by = ?, redeemed_at = ? WHERE id = ?`, userID, now, inv.ID); err != nil {
		return nil, fmt.Errorf("failed to mark invite redeemed: %w", err)
	}

	if err == ErrNotCampaignMember {
		if _, err := tx.Exec(`INSERT INTO campaign_members (campaign_id, user_id, role, status, invited_by, created_at) VALUES (?, ?, ?, 'accepted', ?, ?)`, inv.CampaignID, userID, inv.RoleDefault, inv.InvitedBy, now); err != nil {
			return nil, fmt.Errorf("failed to insert membership: %w", err)
		}
	} else {
		if _, err := tx.Exec(`UPDATE campaign_members SET role = ?, status = 'accepted' WHERE campaign_id = ? AND user_id = ?`, inv.RoleDefault, inv.CampaignID, userID); err != nil {
			return nil, fmt.Errorf("failed to update membership: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit invite acceptance: %w", err)
	}

	return s.getCampaignByID(inv.CampaignID)
}

func (s *Store) generateUniqueInviteCode() (string, error) {
	for i := 0; i < 5; i++ {
		code := randomCode(8)
		var exists int
		err := s.db.QueryRow(`SELECT 1 FROM campaign_invites WHERE code = ?`, code).Scan(&exists)
		if err == sql.ErrNoRows {
			return code, nil
		}
		if err != nil && err != sql.ErrNoRows {
			return "", fmt.Errorf("failed to check invite code: %w", err)
		}
	}
	return "", fmt.Errorf("could not generate unique invite code")
}

// ListCampaignMembers returns member summaries if requester is a member.
func (s *Store) ListCampaignMembers(campaignID, userID int64) ([]*models.CampaignMemberSummary, error) {
	if _, _, err := s.getMembership(campaignID, userID); err != nil {
		return nil, err
	}

	rows, err := s.db.Query(
		`SELECT m.id, m.campaign_id, m.user_id, u.username, m.role, m.status, m.invited_by, m.created_at
		 FROM campaign_members m
		 JOIN users u ON u.id = m.user_id
		 WHERE m.campaign_id = ?
		 ORDER BY m.created_at ASC`,
		campaignID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list members: %w", err)
	}
	defer rows.Close()

	var members []*models.CampaignMemberSummary
	for rows.Next() {
		var m models.CampaignMemberSummary
		var invitedBy sql.NullInt64
		if err := rows.Scan(&m.ID, &m.CampaignID, &m.UserID, &m.Username, &m.Role, &m.Status, &invitedBy, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}
		if invitedBy.Valid {
			m.InvitedBy = &invitedBy.Int64
		}
		members = append(members, &m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating members: %w", err)
	}

	return members, nil
}

// UpdateMemberRole changes a member role if permitted.
func (s *Store) UpdateMemberRole(campaignID, targetUserID, actorUserID int64, role string) (*models.CampaignMemberSummary, error) {
	if role != "owner" && role != "editor" && role != "viewer" {
		return nil, fmt.Errorf("invalid role")
	}

	actorRole, actorStatus, err := s.getMembership(campaignID, actorUserID)
	if err != nil {
		return nil, err
	}
	if actorStatus != "accepted" || (actorRole != "owner" && actorRole != "editor") {
		return nil, ErrNotPermitted
	}

	// Prevent demoting an owner by non-owner
	targetRole, _, err := s.getMembership(campaignID, targetUserID)
	if err != nil {
		return nil, err
	}
	if targetRole == "owner" && actorRole != "owner" {
		return nil, ErrNotPermitted
	}

	if _, err := s.db.Exec(`UPDATE campaign_members SET role = ? WHERE campaign_id = ? AND user_id = ?`, role, campaignID, targetUserID); err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	return s.getMemberSummary(campaignID, targetUserID)
}

// RevokeMember sets status to revoked (non-owner targets only).
func (s *Store) RevokeMember(campaignID, targetUserID, actorUserID int64) error {
	actorRole, actorStatus, err := s.getMembership(campaignID, actorUserID)
	if err != nil {
		return err
	}
	if actorStatus != "accepted" || (actorRole != "owner" && actorRole != "editor") {
		return ErrNotPermitted
	}

	targetRole, _, err := s.getMembership(campaignID, targetUserID)
	if err != nil {
		return err
	}
	if targetRole == "owner" {
		return ErrNotPermitted
	}

	if _, err := s.db.Exec(`UPDATE campaign_members SET status = 'revoked' WHERE campaign_id = ? AND user_id = ?`, campaignID, targetUserID); err != nil {
		return fmt.Errorf("failed to revoke member: %w", err)
	}

	return nil
}

func (s *Store) getMemberSummary(campaignID, userID int64) (*models.CampaignMemberSummary, error) {
	var m models.CampaignMemberSummary
	var invitedBy sql.NullInt64
	row := s.db.QueryRow(
		`SELECT m.id, m.campaign_id, m.user_id, u.username, m.role, m.status, m.invited_by, m.created_at
		 FROM campaign_members m JOIN users u ON u.id = m.user_id
		 WHERE m.campaign_id = ? AND m.user_id = ?`,
		campaignID, userID,
	)
	if err := row.Scan(&m.ID, &m.CampaignID, &m.UserID, &m.Username, &m.Role, &m.Status, &invitedBy, &m.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotCampaignMember
		}
		return nil, fmt.Errorf("failed to scan member: %w", err)
	}
	if invitedBy.Valid {
		m.InvitedBy = &invitedBy.Int64
	}
	return &m, nil
}

func (s *Store) getCampaignOwner(campaignID int64) (int64, error) {
	var ownerID int64
	if err := s.db.QueryRow(`SELECT owner_id FROM campaigns WHERE id = ?`, campaignID).Scan(&ownerID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrCampaignNotFound
		}
		return 0, fmt.Errorf("failed to get campaign: %w", err)
	}
	return ownerID, nil
}

func (s *Store) getCampaignByID(campaignID int64) (*models.Campaign, error) {
	row := s.db.QueryRow(`SELECT id, owner_id, name, description, visibility, status, created_at, updated_at FROM campaigns WHERE id = ?`, campaignID)
	return scanCampaign(row)
}

func (s *Store) getMembership(campaignID, userID int64) (role string, status string, err error) {
	if err := s.db.QueryRow(
		`SELECT role, status FROM campaign_members WHERE campaign_id = ? AND user_id = ?`,
		campaignID, userID,
	).Scan(&role, &status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", "", ErrNotCampaignMember
		}
		return "", "", fmt.Errorf("failed to check membership: %w", err)
	}
	return role, status, nil
}

func (s *Store) characterOwnedByUser(characterID, userID int64) (bool, error) {
	var ownerID int64
	if err := s.db.QueryRow(`SELECT user_id FROM characters WHERE id = ?`, characterID).Scan(&ownerID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, ErrCharacterNotOwned
		}
		return false, fmt.Errorf("failed to verify character ownership: %w", err)
	}
	return ownerID == userID, nil
}

func scanCampaign(scanner interface{ Scan(dest ...any) error }) (*models.Campaign, error) {
	var c models.Campaign
	if err := scanner.Scan(&c.ID, &c.OwnerID, &c.Name, &c.Description, &c.Visibility, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, fmt.Errorf("failed to scan campaign: %w", err)
	}
	return &c, nil
}

func isValidCampaignStatus(status string) bool {
	switch status {
	case models.CampaignStatusNotStarted, models.CampaignStatusInProgress, models.CampaignStatusPaused, models.CampaignStatusCompleted, models.CampaignStatusArchived:
		return true
	default:
		return false
	}
}

// ListCampaignDetails returns campaigns the user belongs to along with linked characters and their owners.
func (s *Store) ListCampaignDetails(userID int64) ([]*models.CampaignDetail, error) {
	rows, err := s.db.Query(
		`SELECT c.id, c.owner_id, c.name, c.description, c.visibility, c.status, c.created_at, c.updated_at,
		        cc.id, ch.id, ch.name, ch.class, ch.level, u.id, u.username
		 FROM campaigns c
		 INNER JOIN campaign_members m ON m.campaign_id = c.id
		 LEFT JOIN campaign_characters cc ON cc.campaign_id = c.id
		 LEFT JOIN characters ch ON ch.id = cc.character_id
		 LEFT JOIN users u ON u.id = ch.user_id
		 WHERE m.user_id = ? AND m.status = 'accepted'
		 ORDER BY c.updated_at DESC, c.id, cc.id`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaign details: %w", err)
	}
	defer rows.Close()

	byID := make(map[int64]*models.CampaignDetail)
	var result []*models.CampaignDetail

	for rows.Next() {
		var campaign models.Campaign
		var ccID sql.NullInt64
		var charID sql.NullInt64
		var charName sql.NullString
		var charClass sql.NullString
		var charLevel sql.NullInt64
		var ownerID sql.NullInt64
		var ownerUsername sql.NullString

		if err := rows.Scan(
			&campaign.ID, &campaign.OwnerID, &campaign.Name, &campaign.Description, &campaign.Visibility, &campaign.Status, &campaign.CreatedAt, &campaign.UpdatedAt,
			&ccID, &charID, &charName, &charClass, &charLevel, &ownerID, &ownerUsername,
		); err != nil {
			return nil, fmt.Errorf("failed to scan campaign detail: %w", err)
		}

		detail, ok := byID[campaign.ID]
		if !ok {
			detail = &models.CampaignDetail{Campaign: campaign, Characters: []models.CampaignCharacterSummary{}}
			byID[campaign.ID] = detail
			result = append(result, detail)
		}

		if ccID.Valid && charID.Valid {
			summary := models.CampaignCharacterSummary{
				LinkID:         ccID.Int64,
				CharacterID:    charID.Int64,
				CharacterName:  charName.String,
				CharacterClass: charClass.String,
				CharacterLevel: int(charLevel.Int64),
				OwnerID:        ownerID.Int64,
				OwnerUsername:  ownerUsername.String,
			}
			detail.Characters = append(detail.Characters, summary)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating campaign details: %w", err)
	}

	return result, nil
}

// Note operations

// CreateNote inserts a note and returns the created record.
func (s *Store) CreateNote(userID int64, entityType string, entityID *int64, title, body string) (*models.Note, error) {
	entityType = strings.TrimSpace(entityType)
	if entityType == "" {
		entityType = "general"
	}

	if strings.TrimSpace(body) == "" && strings.TrimSpace(title) == "" {
		return nil, fmt.Errorf("note content is required")
	}

	now := time.Now()
	res, err := s.db.Exec(
		`INSERT INTO notes (user_id, entity_type, entity_id, title, body, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID, entityType, entityID, title, body, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create note: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get note id: %w", err)
	}

	return &models.Note{
		ID:         id,
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		Title:      title,
		Body:       body,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// SearchNotes performs a full text search with optional entity filters.
func (s *Store) SearchNotes(userID int64, query, entityType string, entityID *int64, limit int) ([]*models.Note, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	conds := []string{"n.user_id = ?"}
	args := []any{userID}

	if entityType = strings.TrimSpace(entityType); entityType != "" {
		conds = append(conds, "n.entity_type = ?")
		args = append(args, entityType)
	}

	if entityID != nil {
		conds = append(conds, "n.entity_id = ?")
		args = append(args, *entityID)
	}

	whereClause := strings.Join(conds, " AND ")
	trimmedQuery := strings.TrimSpace(query)
	var rows *sql.Rows
	var err error

	if trimmedQuery != "" {
		ftsQuery := buildFTSQuery(trimmedQuery)
		if ftsQuery == "" {
			ftsQuery = trimmedQuery
		}
		rows, err = s.db.Query(
			fmt.Sprintf(`
				SELECT n.id, n.user_id, n.entity_type, n.entity_id, n.title, n.body, n.created_at, n.updated_at, bm25(note_fts) as score
				FROM note_fts
				JOIN notes n ON n.id = note_fts.rowid
				WHERE %s AND note_fts MATCH ?
				ORDER BY score ASC, n.updated_at DESC
				LIMIT ?`, whereClause),
			append(args, ftsQuery, limit)...,
		)
	} else {
		rows, err = s.db.Query(
			fmt.Sprintf(`
				SELECT n.id, n.user_id, n.entity_type, n.entity_id, n.title, n.body, n.created_at, n.updated_at, NULL as score
				FROM notes n
				WHERE %s
				ORDER BY n.updated_at DESC
				LIMIT ?`, whereClause),
			append(args, limit)...,
		)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to search notes: %w", err)
	}
	defer rows.Close()

	var notes []*models.Note
	for rows.Next() {
		note, err := scanNoteWithScore(rows)
		if err != nil {
			return nil, err
		}
		notes = append(notes, note)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating notes: %w", err)
	}

	return notes, nil
}

func scanNoteWithScore(scanner interface{ Scan(dest ...any) error }) (*models.Note, error) {
	var n models.Note
	var entityID sql.NullInt64
	var score sql.NullFloat64

	if err := scanner.Scan(&n.ID, &n.UserID, &n.EntityType, &entityID, &n.Title, &n.Body, &n.CreatedAt, &n.UpdatedAt, &score); err != nil {
		return nil, fmt.Errorf("failed to scan note: %w", err)
	}

	if entityID.Valid {
		n.EntityID = &entityID.Int64
	}

	if score.Valid {
		value := score.Float64
		n.Score = &value
	}

	return &n, nil
}

func buildFTSQuery(input string) string {
	terms := strings.Fields(input)
	if len(terms) == 0 {
		return ""
	}

	for i, term := range terms {
		term = strings.ReplaceAll(term, "\"", "\"\"")
		terms[i] = fmt.Sprintf("\"%s\"*", term)
	}

	return strings.Join(terms, " AND ")
}

func randomCode(length int) string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = alphabet[int(time.Now().UnixNano()+int64(i))%len(alphabet)]
	}
	return string(b)
}
