package api

import (
	"encoding/json"

	"github.com/jasoncabot/dicewizard-characters/internal/store"
)

// CreateCharacterRequest is the request body for creating a character
type CreateCharacterRequest struct {
	Name             string `json:"name"`
	Race             string `json:"race"`
	Class            string `json:"class"`
	Level            int    `json:"level"`
	Background       string `json:"background"`
	Alignment        string `json:"alignment"`
	ExperiencePoints int    `json:"experiencePoints"`

	Strength     int `json:"strength"`
	Dexterity    int `json:"dexterity"`
	Constitution int `json:"constitution"`
	Intelligence int `json:"intelligence"`
	Wisdom       int `json:"wisdom"`
	Charisma     int `json:"charisma"`

	MaxHP      int    `json:"maxHp"`
	CurrentHP  int    `json:"currentHp"`
	TempHP     int    `json:"tempHp"`
	ArmorClass int    `json:"armorClass"`
	Speed      int    `json:"speed"`
	HitDice    string `json:"hitDice"`

	SkillProficiencies       []string `json:"skillProficiencies"`
	SavingThrowProficiencies []string `json:"savingThrowProficiencies"`
	Features                 []string `json:"features"`
	Equipment                []string `json:"equipment"`
}

// ToStoreCharacter converts a CreateCharacterRequest to a store.CharacterWithStats
func (r *CreateCharacterRequest) ToStoreCharacter() *store.CharacterWithStats {
	c := &store.CharacterWithStats{
		CharacterModel: store.CharacterModel{
			Name:                     r.Name,
			Race:                     r.Race,
			Class:                    r.Class,
			Level:                    int64(r.Level),
			Background:               r.Background,
			Alignment:                r.Alignment,
			ExperiencePoints:         int64(r.ExperiencePoints),
			Strength:                 int64(r.Strength),
			Dexterity:                int64(r.Dexterity),
			Constitution:             int64(r.Constitution),
			Intelligence:             int64(r.Intelligence),
			Wisdom:                   int64(r.Wisdom),
			Charisma:                 int64(r.Charisma),
			MaxHp:                    int64(r.MaxHP),
			CurrentHp:                int64(r.CurrentHP),
			TempHp:                   int64(r.TempHP),
			ArmorClass:               int64(r.ArmorClass),
			Speed:                    int64(r.Speed),
			HitDice:                  r.HitDice,
			SkillProficiencies:       sliceToJSON(r.SkillProficiencies),
			SavingThrowProficiencies: sliceToJSON(r.SavingThrowProficiencies),
			Features:                 sliceToJSON(r.Features),
			Equipment:                sliceToJSON(r.Equipment),
		},
	}

	// Set defaults
	if c.Level == 0 {
		c.Level = 1
	}
	if c.Strength == 0 {
		c.Strength = 10
	}
	if c.Dexterity == 0 {
		c.Dexterity = 10
	}
	if c.Constitution == 0 {
		c.Constitution = 10
	}
	if c.Intelligence == 0 {
		c.Intelligence = 10
	}
	if c.Wisdom == 0 {
		c.Wisdom = 10
	}
	if c.Charisma == 0 {
		c.Charisma = 10
	}
	if c.MaxHp == 0 {
		c.MaxHp = 10
	}
	if c.CurrentHp == 0 {
		c.CurrentHp = c.MaxHp
	}
	if c.ArmorClass == 0 {
		c.ArmorClass = 10
	}
	if c.Speed == 0 {
		c.Speed = 30
	}
	if c.HitDice == "" {
		c.HitDice = "1d8"
	}

	return c
}

// CreateNoteRequest captures the payload for creating a note.
type CreateNoteRequest struct {
	EntityType string `json:"entityType"`
	EntityID   *int64 `json:"entityId,omitempty"`
	Title      string `json:"title"`
	Body       string `json:"body"`
}

func sliceToJSON(s []string) string {
	if s == nil {
		return "[]"
	}
	b, err := json.Marshal(s)
	if err != nil {
		return "[]"
	}
	return string(b)
}
