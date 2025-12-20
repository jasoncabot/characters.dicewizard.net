// D&D 5e Character Types

export interface Character {
  id: number;
  user_id: number;
  name: string;
  race: Species; // Called "species" in 2024 rules, but keeping "race" for backwards compat
  class: ClassName;
  level: number;
  background: BackgroundName;
  alignment: Alignment;
  experiencePoints: number;

  // Ability scores
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  // Combat stats
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  speed: number;
  hitDice: string;

  // Proficiencies (JSON arrays)
  skillProficiencies: SkillName[];
  savingThrowProficiencies: Ability[];
  features: string[];
  equipment: string[];
  avatarUrl?: string;

  // Computed (from backend)
  strengthModifier: number;
  dexterityModifier: number;
  constitutionModifier: number;
  intelligenceModifier: number;
  wisdomModifier: number;
  charismaModifier: number;
  proficiencyBonus: number;
  initiative: number;
  passivePerception: number;

  createdAt: string;
  updatedAt: string;
}

export interface CharacterCreate {
  name: string;
  race: Species;
  class: ClassName;
  level: number;
  background: BackgroundName;
  alignment: Alignment;
  experiencePoints: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  speed: number;
  hitDice: string;
  skillProficiencies: SkillName[];
  savingThrowProficiencies: Ability[];
  features: string[];
  equipment: string[];
}

// User types for multi-account support
export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface UserCreate {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// D&D Constants
export const ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_LABELS: Record<Ability, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export const ABILITY_DESCRIPTIONS: Record<Ability, string> = {
  strength: "Physical power, athletics, melee attacks",
  dexterity: "Agility, reflexes, ranged attacks, AC",
  constitution: "Health, stamina, hit points",
  intelligence: "Reasoning, memory, investigation",
  wisdom: "Perception, insight, willpower",
  charisma: "Force of personality, persuasion",
};

export const SKILLS = {
  Acrobatics: "dexterity",
  "Animal Handling": "wisdom",
  Arcana: "intelligence",
  Athletics: "strength",
  Deception: "charisma",
  History: "intelligence",
  Insight: "wisdom",
  Intimidation: "charisma",
  Investigation: "intelligence",
  Medicine: "wisdom",
  Nature: "intelligence",
  Perception: "wisdom",
  Performance: "charisma",
  Persuasion: "charisma",
  Religion: "intelligence",
  "Sleight of Hand": "dexterity",
  Stealth: "dexterity",
  Survival: "wisdom",
} as const satisfies Record<string, Ability>;

export type SkillName = keyof typeof SKILLS;

// 2024 Player's Handbook Species (formerly Races)
export const SPECIES = [
  "Aasimar",
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Goliath",
  "Halfling",
  "Human",
  "Orc",
  "Tiefling",
] as const;
export type Species = (typeof SPECIES)[number];

// Keep RACES as alias for backwards compatibility
export const RACES = SPECIES;

export type CreatureSize = "Small" | "Medium";

// Species traits for 2024 rules
export const SPECIES_TRAITS = {
  Aasimar: {
    size: "Medium",
    speed: 30,
    traits: [
      "Celestial Resistance",
      "Darkvision",
      "Healing Hands",
      "Light Bearer",
    ],
  },
  Dragonborn: {
    size: "Medium",
    speed: 30,
    traits: [
      "Draconic Ancestry",
      "Breath Weapon",
      "Damage Resistance",
      "Darkvision",
    ],
  },
  Dwarf: {
    size: "Medium",
    speed: 30,
    traits: [
      "Darkvision",
      "Dwarven Resilience",
      "Dwarven Toughness",
      "Stonecunning",
    ],
  },
  Elf: {
    size: "Medium",
    speed: 30,
    traits: ["Darkvision", "Fey Ancestry", "Keen Senses", "Trance"],
  },
  Gnome: {
    size: "Small",
    speed: 30,
    traits: ["Darkvision", "Gnomish Cunning", "Gnomish Lineage"],
  },
  Goliath: {
    size: "Medium",
    speed: 35,
    traits: ["Large Form", "Powerful Build", "Giant Ancestry"],
  },
  Halfling: {
    size: "Small",
    speed: 30,
    traits: ["Brave", "Halfling Nimbleness", "Luck", "Naturally Stealthy"],
  },
  Human: {
    size: "Medium",
    speed: 30,
    traits: ["Resourceful", "Skillful", "Versatile"],
  },
  Orc: {
    size: "Medium",
    speed: 30,
    traits: ["Adrenaline Rush", "Darkvision", "Relentless Endurance"],
  },
  Tiefling: {
    size: "Medium",
    speed: 30,
    traits: ["Darkvision", "Fiendish Legacy", "Otherworldly Presence"],
  },
} as const satisfies Record<
  Species,
  { size: CreatureSize; speed: number; traits: readonly string[] }
>;

export type SpeciesTrait = (typeof SPECIES_TRAITS)[Species]["traits"][number];

export const CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const;
export type ClassName = (typeof CLASSES)[number];

// 2024 Backgrounds - each grants ability score increases, skill proficiencies, and a feat
export const BACKGROUNDS = [
  "Acolyte",
  "Artisan",
  "Charlatan",
  "Criminal",
  "Entertainer",
  "Farmer",
  "Guard",
  "Guide",
  "Hermit",
  "Merchant",
  "Noble",
  "Sage",
  "Sailor",
  "Scribe",
  "Soldier",
  "Wayfarer",
] as const;
export type BackgroundName = (typeof BACKGROUNDS)[number];

// Background details for 2024 rules
export const BACKGROUND_DETAILS = {
  Acolyte: {
    abilityScores: "+2 Wis, +1 Int or +1 to three",
    skillProficiencies: ["Insight", "Religion"],
    feat: "Magic Initiate (Cleric)",
  },
  Artisan: {
    abilityScores: "+2 Int, +1 Cha or +1 to three",
    skillProficiencies: ["Investigation", "Persuasion"],
    feat: "Crafter",
  },
  Charlatan: {
    abilityScores: "+2 Cha, +1 Dex or +1 to three",
    skillProficiencies: ["Deception", "Sleight of Hand"],
    feat: "Skilled",
  },
  Criminal: {
    abilityScores: "+2 Dex, +1 Int or +1 to three",
    skillProficiencies: ["Sleight of Hand", "Stealth"],
    feat: "Alert",
  },
  Entertainer: {
    abilityScores: "+2 Cha, +1 Dex or +1 to three",
    skillProficiencies: ["Acrobatics", "Performance"],
    feat: "Musician",
  },
  Farmer: {
    abilityScores: "+2 Con, +1 Wis or +1 to three",
    skillProficiencies: ["Animal Handling", "Nature"],
    feat: "Tough",
  },
  Guard: {
    abilityScores: "+2 Str, +1 Wis or +1 to three",
    skillProficiencies: ["Athletics", "Perception"],
    feat: "Alert",
  },
  Guide: {
    abilityScores: "+2 Wis, +1 Dex or +1 to three",
    skillProficiencies: ["Stealth", "Survival"],
    feat: "Magic Initiate (Druid)",
  },
  Hermit: {
    abilityScores: "+2 Wis, +1 Con or +1 to three",
    skillProficiencies: ["Medicine", "Religion"],
    feat: "Healer",
  },
  Merchant: {
    abilityScores: "+2 Cha, +1 Int or +1 to three",
    skillProficiencies: ["Animal Handling", "Persuasion"],
    feat: "Lucky",
  },
  Noble: {
    abilityScores: "+2 Cha, +1 Int or +1 to three",
    skillProficiencies: ["History", "Persuasion"],
    feat: "Skilled",
  },
  Sage: {
    abilityScores: "+2 Int, +1 Wis or +1 to three",
    skillProficiencies: ["Arcana", "History"],
    feat: "Magic Initiate (Wizard)",
  },
  Sailor: {
    abilityScores: "+2 Dex, +1 Wis or +1 to three",
    skillProficiencies: ["Acrobatics", "Perception"],
    feat: "Tavern Brawler",
  },
  Scribe: {
    abilityScores: "+2 Int, +1 Wis or +1 to three",
    skillProficiencies: ["Investigation", "Perception"],
    feat: "Skilled",
  },
  Soldier: {
    abilityScores: "+2 Str, +1 Con or +1 to three",
    skillProficiencies: ["Athletics", "Intimidation"],
    feat: "Savage Attacker",
  },
  Wayfarer: {
    abilityScores: "+2 Wis, +1 Con or +1 to three",
    skillProficiencies: ["Insight", "Stealth"],
    feat: "Lucky",
  },
} as const satisfies Record<
  BackgroundName,
  {
    abilityScores: string;
    skillProficiencies: readonly SkillName[];
    feat: string;
  }
>;

export const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export const CLASS_HIT_DICE: Record<ClassName, number> = {
  Barbarian: 12,
  Fighter: 10,
  Paladin: 10,
  Ranger: 10,
  Bard: 8,
  Cleric: 8,
  Druid: 8,
  Monk: 8,
  Rogue: 8,
  Warlock: 8,
  Sorcerer: 6,
  Wizard: 6,
};

// Class saving throw proficiencies (2024 rules)
export const CLASS_SAVING_THROWS: Record<ClassName, Ability[]> = {
  Barbarian: ["strength", "constitution"],
  Bard: ["dexterity", "charisma"],
  Cleric: ["wisdom", "charisma"],
  Druid: ["intelligence", "wisdom"],
  Fighter: ["strength", "constitution"],
  Monk: ["strength", "dexterity"],
  Paladin: ["wisdom", "charisma"],
  Ranger: ["strength", "dexterity"],
  Rogue: ["dexterity", "intelligence"],
  Sorcerer: ["constitution", "charisma"],
  Warlock: ["wisdom", "charisma"],
  Wizard: ["intelligence", "wisdom"],
};

// Standard array for ability scores (2024 rules)
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Point buy costs (2024 rules)
export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export const POINT_BUY_TOTAL = 27;

// Utility functions
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

// Roll 4d6 drop lowest
export function rollAbilityScore(): { rolls: number[]; total: number } {
  const rolls = Array.from(
    { length: 4 },
    () => Math.floor(Math.random() * 6) + 1,
  );
  const sorted = [...rolls].sort((a, b) => b - a);
  const total = sorted.slice(0, 3).reduce((sum, n) => sum + n, 0);
  return { rolls, total };
}

// Calculate point buy cost for a set of scores
export function calculatePointBuyCost(scores: Record<Ability, number>): number {
  return Object.values(scores).reduce((total, score) => {
    return total + (POINT_BUY_COSTS[score] ?? 0);
  }, 0);
}
