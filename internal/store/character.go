package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// ListCharacters returns all characters for a user.
func (s *Store) ListCharacters(userID int64) ([]*CharacterWithStats, error) {
	ctx := context.Background()

	chars, err := s.q.ListCharactersByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query characters: %w", err)
	}

	result := make([]*CharacterWithStats, 0, len(chars))
	for _, c := range chars {
		model := &CharacterWithStats{
			CharacterModel: toCharacterModel(c),
		}
		model.ComputeModifiers()
		result = append(result, model)
	}

	return result, nil
}

// GetCharacter returns a character by ID for a specific user.
func (s *Store) GetCharacter(id, userID int64) (*CharacterWithStats, error) {
	ctx := context.Background()

	c, err := s.q.GetCharacterByIDAndUser(ctx, GetCharacterByIDAndUserParams{ID: id, UserID: userID})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get character: %w", err)
	}

	model := &CharacterWithStats{
		CharacterModel: c,
	}
	model.ComputeModifiers()
	return model, nil
}

// CreateCharacter creates a new character.
func (s *Store) CreateCharacter(c *CharacterWithStats) error {
	ctx := context.Background()

	inserted, err := s.q.InsertCharacter(ctx, c.ToInsertParams())
	if err != nil {
		return fmt.Errorf("failed to create character: %w", err)
	}

	// InsertCharacter returns Character (generated), which is different from CharacterModel (GetCharacterByIDAndUserRow)
	// But we can map it.
	// Wait, InsertCharacter returns Character.
	// I need to convert Character to CharacterModel.
	// They are similar but Character has pointers.
	// I should update InsertCharacter to return the same row structure?
	// Or just map it manually here.

	// Actually, InsertCharacter returns Character struct.
	// CharacterModel is GetCharacterByIDAndUserRow.
	// I need a helper to convert Character to CharacterModel.

	model := characterToModel(inserted)
	c.CharacterModel = model
	c.ComputeModifiers()
	return nil
}

// UpdateCharacter updates an existing character.
func (s *Store) UpdateCharacter(c *CharacterWithStats) error {
	ctx := context.Background()

	updated, err := s.q.UpdateCharacter(ctx, c.ToUpdateParams())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("character not found")
		}
		return fmt.Errorf("failed to update character: %w", err)
	}

	model := characterToModel(updated)
	c.CharacterModel = model
	c.ComputeModifiers()
	return nil
}

// DeleteCharacter deletes a character by ID for a specific user.
func (s *Store) DeleteCharacter(id, userID int64) error {
	ctx := context.Background()

	rows, err := s.q.DeleteCharacter(ctx, DeleteCharacterParams{ID: id, UserID: userID})
	if err != nil {
		return fmt.Errorf("failed to delete character: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("character not found")
	}
	return nil
}

// UpdateCharacterAvatar sets the avatar URL for a character owned by the user.
func (s *Store) UpdateCharacterAvatar(id, userID int64, avatarURL string) (*CharacterWithStats, error) {
	ctx := context.Background()

	updated, err := s.q.UpdateCharacterAvatar(ctx, UpdateCharacterAvatarParams{
		AvatarUrl: &avatarURL,
		ID:        id,
		UserID:    userID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("character not found")
		}
		return nil, fmt.Errorf("failed to update character avatar: %w", err)
	}

	model := &CharacterWithStats{
		CharacterModel: characterToModel(updated),
	}
	model.ComputeModifiers()
	return model, nil
}

func (s *Store) characterOwnedByUser(characterID, userID int64) (bool, error) {
	ctx := context.Background()

	ownerID, err := s.q.GetCharacterOwner(ctx, characterID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, ErrCharacterNotOwned
		}
		return false, fmt.Errorf("failed to verify character ownership: %w", err)
	}
	return ownerID == userID, nil
}

func characterToModel(c Character) CharacterModel {
	return CharacterModel{
		ID:                       c.ID,
		UserID:                   c.UserID,
		Name:                     c.Name,
		Race:                     c.Race,
		Class:                    c.Class,
		Level:                    c.Level,
		Background:               nullString(c.Background),
		Alignment:                nullString(c.Alignment),
		ExperiencePoints:         nullInt64(c.ExperiencePoints),
		Strength:                 c.Strength,
		Dexterity:                c.Dexterity,
		Constitution:             c.Constitution,
		Intelligence:             c.Intelligence,
		Wisdom:                   c.Wisdom,
		Charisma:                 c.Charisma,
		MaxHp:                    c.MaxHp,
		CurrentHp:                c.CurrentHp,
		TempHp:                   nullInt64(c.TempHp),
		ArmorClass:               c.ArmorClass,
		Speed:                    nullInt64(c.Speed),
		HitDice:                  nullString(c.HitDice),
		SkillProficiencies:       nullJSONString(c.SkillProficiencies),
		SavingThrowProficiencies: nullJSONString(c.SavingThrowProficiencies),
		Features:                 nullJSONString(c.Features),
		Equipment:                nullJSONString(c.Equipment),
		AvatarUrl:                nullString(c.AvatarUrl),
		CreatedAt:                c.CreatedAt,
		UpdatedAt:                c.UpdatedAt,
	}
}
