package store

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/jasoncabot/dicewizard-characters/internal/models"
	"github.com/pressly/goose/v3"
)

func setupTestStore(t *testing.T) *Store {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "test.db")
	s, err := NewFromPath(dbPath)
	if err != nil {
		t.Fatalf("failed to open store: %v", err)
	}

	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatalf("set dialect: %v", err)
	}
	goose.SetBaseFS(Migrations)
	if err := goose.Up(s.DB(), "migrations"); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	return s
}

func TestMigrationsUpDownUp(t *testing.T) {
	t.TempDir()

	dbPath := filepath.Join(t.TempDir(), "migrate.db")
	s, err := NewFromPath(dbPath)
	if err != nil {
		t.Fatalf("failed to open store: %v", err)
	}
	defer s.Close()

	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatalf("set dialect: %v", err)
	}
	goose.SetBaseFS(Migrations)

	if err := goose.Up(s.DB(), "migrations"); err != nil {
		t.Fatalf("initial up failed: %v", err)
	}

	if err := goose.Reset(s.DB(), "migrations"); err != nil {
		t.Fatalf("reset (down to 0) failed: %v", err)
	}

	if err := goose.Up(s.DB(), "migrations"); err != nil {
		t.Fatalf("second up failed: %v", err)
	}
}

func TestAddCharacterToCampaign_AllowsOwnerEditor(t *testing.T) {
	s := setupTestStore(t)
	defer s.Close()

	owner, err := s.CreateUser("alice", "hash")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	character := &CharacterWithStats{
		CharacterModel: CharacterModel{
			UserID:   owner.ID,
			Name:     "Hero",
			Race:     "Human",
			Class:    "Fighter",
			Level:    1,
			Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10,
			MaxHp: 10, CurrentHp: 10, ArmorClass: 10, Speed: 30, HitDice: "1d8",
			SkillProficiencies:       "[]",
			SavingThrowProficiencies: "[]",
			Features:                 "[]",
			Equipment:                "[]",
		},
	}

	if err := s.CreateCharacter(character); err != nil {
		t.Fatalf("create character: %v", err)
	}

	campaign, err := s.CreateCampaign(owner.ID, "Test Campaign", "", models.CampaignVisibilityPrivate, models.CampaignStatusNotStarted)
	if err != nil {
		t.Fatalf("create campaign: %v", err)
	}

	link, err := s.AddCharacterToCampaign(campaign.ID, character.ID, owner.ID)
	if err != nil {
		t.Fatalf("add character to campaign: %v", err)
	}

	if link.CampaignID != campaign.ID || link.CharacterID != character.ID {
		t.Fatalf("unexpected link data: %+v", link)
	}
}

func TestAddCharacterToCampaign_ViewerForbidden(t *testing.T) {
	s := setupTestStore(t)
	defer s.Close()

	owner, _ := s.CreateUser("owner", "hash")
	viewer, _ := s.CreateUser("viewer", "hash")

	character := &CharacterWithStats{
		CharacterModel: CharacterModel{
			UserID:   owner.ID,
			Name:     "Hero",
			Race:     "Human",
			Class:    "Fighter",
			Level:    1,
			Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10,
			MaxHp: 10, CurrentHp: 10, ArmorClass: 10, Speed: 30, HitDice: "1d8",
			SkillProficiencies:       "[]",
			SavingThrowProficiencies: "[]",
			Features:                 "[]",
			Equipment:                "[]",
		},
	}
	_ = s.CreateCharacter(character)

	campaign, _ := s.CreateCampaign(owner.ID, "Test Campaign", "", models.CampaignVisibilityPrivate, models.CampaignStatusNotStarted)

	_, err := s.db.Exec(`INSERT INTO campaign_members (campaign_id, user_id, role, status) VALUES (?, ?, 'viewer', 'accepted')`, campaign.ID, viewer.ID)
	if err != nil {
		t.Fatalf("failed to insert viewer membership: %v", err)
	}

	if _, err := s.AddCharacterToCampaign(campaign.ID, character.ID, viewer.ID); err != ErrNotPermitted {
		t.Fatalf("expected ErrNotPermitted, got %v", err)
	}
}

func TestAddCharacterToCampaign_OwnershipRequired(t *testing.T) {
	s := setupTestStore(t)
	defer s.Close()

	owner, _ := s.CreateUser("owner2", "hash")
	other, _ := s.CreateUser("other2", "hash")

	campaign, _ := s.CreateCampaign(owner.ID, "Test Campaign", "", models.CampaignVisibilityPrivate, models.CampaignStatusNotStarted)

	foreignChar := &CharacterWithStats{
		CharacterModel: CharacterModel{
			UserID:   other.ID,
			Name:     "Rogue",
			Race:     "Human",
			Class:    "Rogue",
			Level:    1,
			Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10,
			MaxHp: 10, CurrentHp: 10, ArmorClass: 10, Speed: 30, HitDice: "1d8",
			SkillProficiencies:       "[]",
			SavingThrowProficiencies: "[]",
			Features:                 "[]",
			Equipment:                "[]",
		},
	}
	_ = s.CreateCharacter(foreignChar)

	if _, err := s.AddCharacterToCampaign(campaign.ID, foreignChar.ID, owner.ID); err != ErrCharacterNotOwned {
		t.Fatalf("expected ErrCharacterNotOwned, got %v", err)
	}
}

func TestSearchNotes_FTSAndEntityFilter(t *testing.T) {
	s := setupTestStore(t)
	defer s.Close()

	user, _ := s.CreateUser("note-owner", "hash")
	other, _ := s.CreateUser("note-other", "hash")

	mapID := int64(42)
	_, err := s.CreateNote(user.ID, "map", &mapID, "Lair entrance", "Dragon lair map near waterfall")
	if err != nil {
		t.Fatalf("create map note: %v", err)
	}

	_, err = s.CreateNote(user.ID, "npc", nil, "Friendly innkeeper", "Helpful NPC in town square")
	if err != nil {
		t.Fatalf("create npc note: %v", err)
	}

	_, _ = s.CreateNote(other.ID, "npc", nil, "Hidden", "Should not appear")

	results, err := s.SearchNotes(user.ID, "lair", "", nil, 10)
	if err != nil {
		t.Fatalf("search notes: %v", err)
	}
	if len(results) != 1 || !strings.Contains(results[0].Body, "lair") {
		t.Fatalf("expected lair note, got %+v", results)
	}

	filtered, err := s.SearchNotes(user.ID, "helpful", "npc", nil, 10)
	if err != nil {
		t.Fatalf("search filtered: %v", err)
	}
	if len(filtered) != 1 || filtered[0].EntityType != "npc" {
		t.Fatalf("expected npc note, got %+v", filtered)
	}
}
