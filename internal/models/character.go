package models

import (
	"encoding/json"
	"time"
)

// Character represents a D&D 5e character sheet
type Character struct {
	ID               int64  `json:"id"`
	UserID           int64  `json:"user_id"`
	Name             string `json:"name"`
	Race             string `json:"race"`
	Class            string `json:"class"`
	Level            int    `json:"level"`
	Background       string `json:"background"`
	Alignment        string `json:"alignment"`
	ExperiencePoints int    `json:"experiencePoints"`

	// Ability scores
	Strength     int `json:"strength"`
	Dexterity    int `json:"dexterity"`
	Constitution int `json:"constitution"`
	Intelligence int `json:"intelligence"`
	Wisdom       int `json:"wisdom"`
	Charisma     int `json:"charisma"`

	// Combat stats
	MaxHP      int    `json:"maxHp"`
	CurrentHP  int    `json:"currentHp"`
	TempHP     int    `json:"tempHp"`
	ArmorClass int    `json:"armorClass"`
	Speed      int    `json:"speed"`
	HitDice    string `json:"hitDice"`

	// Proficiencies
	SkillProficiencies       []string `json:"skillProficiencies"`
	SavingThrowProficiencies []string `json:"savingThrowProficiencies"`

	// Other
	Features  []string `json:"features"`
	Equipment []string `json:"equipment"`
	Notes     string   `json:"notes"`
	AvatarURL string   `json:"avatarUrl"`

	// Timestamps
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

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
func (c *Character) ComputeModifiers() {
	c.StrengthModifier = abilityModifier(c.Strength)
	c.DexterityModifier = abilityModifier(c.Dexterity)
	c.ConstitutionModifier = abilityModifier(c.Constitution)
	c.IntelligenceModifier = abilityModifier(c.Intelligence)
	c.WisdomModifier = abilityModifier(c.Wisdom)
	c.CharismaModifier = abilityModifier(c.Charisma)
	c.ProficiencyBonus = proficiencyBonus(c.Level)
	c.Initiative = c.DexterityModifier
	c.PassivePerception = 10 + c.WisdomModifier

	// Add proficiency to passive perception if proficient
	for _, skill := range c.SkillProficiencies {
		if skill == "perception" {
			c.PassivePerception += c.ProficiencyBonus
			break
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

// SkillBonus calculates the bonus for a specific skill
func (c *Character) SkillBonus(skill string) int {
	ability, ok := Skills[skill]
	if !ok {
		return 0
	}

	var modifier int
	switch ability {
	case "strength":
		modifier = c.StrengthModifier
	case "dexterity":
		modifier = c.DexterityModifier
	case "constitution":
		modifier = c.ConstitutionModifier
	case "intelligence":
		modifier = c.IntelligenceModifier
	case "wisdom":
		modifier = c.WisdomModifier
	case "charisma":
		modifier = c.CharismaModifier
	}

	// Check if proficient
	for _, profSkill := range c.SkillProficiencies {
		if profSkill == skill {
			return modifier + c.ProficiencyBonus
		}
	}

	return modifier
}

// SavingThrowBonus calculates the bonus for a saving throw
func (c *Character) SavingThrowBonus(ability string) int {
	var modifier int
	switch ability {
	case "strength":
		modifier = c.StrengthModifier
	case "dexterity":
		modifier = c.DexterityModifier
	case "constitution":
		modifier = c.ConstitutionModifier
	case "intelligence":
		modifier = c.IntelligenceModifier
	case "wisdom":
		modifier = c.WisdomModifier
	case "charisma":
		modifier = c.CharismaModifier
	default:
		return 0
	}

	// Check if proficient
	for _, profAbility := range c.SavingThrowProficiencies {
		if profAbility == ability {
			return modifier + c.ProficiencyBonus
		}
	}

	return modifier
}

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
	Notes                    string   `json:"notes"`
}

// ToCharacter converts a CreateCharacterRequest to a Character
func (r *CreateCharacterRequest) ToCharacter() *Character {
	c := &Character{
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
		MaxHP:                    r.MaxHP,
		CurrentHP:                r.CurrentHP,
		TempHP:                   r.TempHP,
		ArmorClass:               r.ArmorClass,
		Speed:                    r.Speed,
		HitDice:                  r.HitDice,
		SkillProficiencies:       r.SkillProficiencies,
		SavingThrowProficiencies: r.SavingThrowProficiencies,
		Features:                 r.Features,
		Equipment:                r.Equipment,
		Notes:                    r.Notes,
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
	if c.MaxHP == 0 {
		c.MaxHP = 10
	}
	if c.CurrentHP == 0 {
		c.CurrentHP = c.MaxHP
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
	if c.SkillProficiencies == nil {
		c.SkillProficiencies = []string{}
	}
	if c.SavingThrowProficiencies == nil {
		c.SavingThrowProficiencies = []string{}
	}
	if c.Features == nil {
		c.Features = []string{}
	}
	if c.Equipment == nil {
		c.Equipment = []string{}
	}

	return c
}

// MarshalSkillProficiencies converts skill proficiencies slice to JSON string
func MarshalStringSlice(slice []string) string {
	if slice == nil {
		return "[]"
	}
	data, _ := json.Marshal(slice)
	return string(data)
}

// UnmarshalStringSlice converts JSON string to string slice
func UnmarshalStringSlice(data string) []string {
	var slice []string
	if err := json.Unmarshal([]byte(data), &slice); err != nil {
		return []string{}
	}
	return slice
}
