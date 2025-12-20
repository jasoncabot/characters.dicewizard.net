package store

import (
	"encoding/json"
)

// CharacterModel is an alias for the generated row struct, which represents a character
// with all fields populated (non-nullable thanks to COALESCE).
type CharacterModel = GetCharacterByIDAndUserRow

// CharacterWithStats extends the DB model with computed fields.
type CharacterWithStats struct {
	CharacterModel

	// Computed fields (not stored in DB)
	StrengthModifier     int `json:"strengthModifier"`
	DexterityModifier    int `json:"dexterityModifier"`
	ConstitutionModifier int `json:"constitutionModifier"`
	IntelligenceModifier int `json:"intelligenceModifier"`
	WisdomModifier       int `json:"wisdomModifier"`
	CharismaModifier     int `json:"charismaModifier"`
	ProficiencyBonus     int `json:"proficiencyBonus"`
	Initiative           int `json:"initiative"`
	PassivePerception    int `json:"passivePerception"`
}

// ComputeModifiers calculates all derived stats
func (c *CharacterWithStats) ComputeModifiers() {
	c.StrengthModifier = abilityModifier(int(c.Strength))
	c.DexterityModifier = abilityModifier(int(c.Dexterity))
	c.ConstitutionModifier = abilityModifier(int(c.Constitution))
	c.IntelligenceModifier = abilityModifier(int(c.Intelligence))
	c.WisdomModifier = abilityModifier(int(c.Wisdom))
	c.CharismaModifier = abilityModifier(int(c.Charisma))
	c.ProficiencyBonus = proficiencyBonus(int(c.Level))
	c.Initiative = c.DexterityModifier
	c.PassivePerception = 10 + c.WisdomModifier

	// Add proficiency to passive perception if proficient
	var skills []string
	if err := json.Unmarshal([]byte(c.SkillProficiencies), &skills); err == nil {
		for _, skill := range skills {
			if skill == "perception" {
				c.PassivePerception += c.ProficiencyBonus
				break
			}
		}
	}
}

// abilityModifier calculates the modifier for an ability score
// Formula: floor((score - 10) / 2)
func abilityModifier(score int) int {
	return (score - 10) / 2
}

// proficiencyBonus returns the proficiency bonus for a given level
func proficiencyBonus(level int) int {
	return ((level - 1) / 4) + 2
}

// Skills defines all D&D 5e skills and their associated abilities
var Skills = map[string]string{
	"acrobatics":     "dexterity",
	"animalHandling": "wisdom",
	"arcana":         "intelligence",
	"athletics":      "strength",
	"deception":      "charisma",
	"history":        "intelligence",
	"insight":        "wisdom",
	"intimidation":   "charisma",
	"investigation":  "intelligence",
	"medicine":       "wisdom",
	"nature":         "intelligence",
	"perception":     "wisdom",
	"performance":    "charisma",
	"persuasion":     "charisma",
	"religion":       "intelligence",
	"sleightOfHand":  "dexterity",
	"stealth":        "dexterity",
	"survival":       "wisdom",
}

// Helper to convert ListCharactersByUserRow to CharacterModel
func toCharacterModel(r ListCharactersByUserRow) CharacterModel {
	return CharacterModel{
		ID:                       r.ID,
		UserID:                   r.UserID,
		Name:                     r.Name,
		Race:                     r.Race,
		Class:                    r.Class,
		Level:                    r.Level,
		Background:               r.Background,
		Alignment:                r.Alignment,
		ExperiencePoints:         r.ExperiencePoints,
		Strength:                 r.Strength,
		Dexterity:                r.Dexterity,
		Constitution:             r.Constitution,
		Intelligence:             r.Intelligence,
		Wisdom:                   r.Wisdom,
		Charisma:                 r.Charisma,
		MaxHp:                    r.MaxHp,
		CurrentHp:                r.CurrentHp,
		TempHp:                   r.TempHp,
		ArmorClass:               r.ArmorClass,
		Speed:                    r.Speed,
		HitDice:                  r.HitDice,
		SkillProficiencies:       r.SkillProficiencies,
		SavingThrowProficiencies: r.SavingThrowProficiencies,
		Features:                 r.Features,
		Equipment:                r.Equipment,
		AvatarUrl:                r.AvatarUrl,
		CreatedAt:                r.CreatedAt,
		UpdatedAt:                r.UpdatedAt,
	}
}

// Helper to convert CharacterWithStats to InsertCharacterParams
func (c *CharacterWithStats) ToInsertParams() InsertCharacterParams {
	return InsertCharacterParams{
		UserID:                   c.UserID,
		Name:                     c.Name,
		Race:                     c.Race,
		Class:                    c.Class,
		Level:                    c.Level,
		Background:               &c.Background,
		Alignment:                &c.Alignment,
		ExperiencePoints:         &c.ExperiencePoints,
		Strength:                 c.Strength,
		Dexterity:                c.Dexterity,
		Constitution:             c.Constitution,
		Intelligence:             c.Intelligence,
		Wisdom:                   c.Wisdom,
		Charisma:                 c.Charisma,
		MaxHp:                    c.MaxHp,
		CurrentHp:                c.CurrentHp,
		TempHp:                   &c.TempHp,
		ArmorClass:               c.ArmorClass,
		Speed:                    &c.Speed,
		HitDice:                  &c.HitDice,
		SkillProficiencies:       &c.SkillProficiencies,
		SavingThrowProficiencies: &c.SavingThrowProficiencies,
		Features:                 &c.Features,
		Equipment:                &c.Equipment,
		AvatarUrl:                &c.AvatarUrl,
	}
}

// Helper to convert CharacterWithStats to UpdateCharacterParams
func (c *CharacterWithStats) ToUpdateParams() UpdateCharacterParams {
	return UpdateCharacterParams{
		Name:                     c.Name,
		Race:                     c.Race,
		Class:                    c.Class,
		Level:                    c.Level,
		Background:               &c.Background,
		Alignment:                &c.Alignment,
		ExperiencePoints:         &c.ExperiencePoints,
		Strength:                 c.Strength,
		Dexterity:                c.Dexterity,
		Constitution:             c.Constitution,
		Intelligence:             c.Intelligence,
		Wisdom:                   c.Wisdom,
		Charisma:                 c.Charisma,
		MaxHp:                    c.MaxHp,
		CurrentHp:                c.CurrentHp,
		TempHp:                   &c.TempHp,
		ArmorClass:               c.ArmorClass,
		Speed:                    &c.Speed,
		HitDice:                  &c.HitDice,
		SkillProficiencies:       &c.SkillProficiencies,
		SavingThrowProficiencies: &c.SavingThrowProficiencies,
		Features:                 &c.Features,
		Equipment:                &c.Equipment,
		ID:                       c.ID,
		UserID:                   c.UserID,
	}
}
