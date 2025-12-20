-- +goose Up
CREATE TABLE characters_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    race TEXT NOT NULL DEFAULT 'Human',
    class TEXT NOT NULL DEFAULT 'Fighter',
    level INTEGER NOT NULL DEFAULT 1,
    background TEXT DEFAULT '',
    alignment TEXT DEFAULT 'True Neutral',
    experience_points INTEGER DEFAULT 0,

    -- Ability scores
    strength INTEGER NOT NULL DEFAULT 10,
    dexterity INTEGER NOT NULL DEFAULT 10,
    constitution INTEGER NOT NULL DEFAULT 10,
    intelligence INTEGER NOT NULL DEFAULT 10,
    wisdom INTEGER NOT NULL DEFAULT 10,
    charisma INTEGER NOT NULL DEFAULT 10,

    -- Combat stats
    max_hp INTEGER NOT NULL DEFAULT 10,
    current_hp INTEGER NOT NULL DEFAULT 10,
    temp_hp INTEGER DEFAULT 0,
    armor_class INTEGER NOT NULL DEFAULT 10,
    speed INTEGER DEFAULT 30,
    hit_dice TEXT DEFAULT '1d8',

    -- JSON columns for flexible data
    skill_proficiencies TEXT DEFAULT '[]',
    saving_throw_proficiencies TEXT DEFAULT '[]',
    features TEXT DEFAULT '[]',
    equipment TEXT DEFAULT '[]',

    avatar_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO characters_new (
    id, user_id, name, race, class, level, background, alignment, experience_points,
    strength, dexterity, constitution, intelligence, wisdom, charisma,
    max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
    skill_proficiencies, saving_throw_proficiencies, features, equipment,
    avatar_url, created_at, updated_at
)
SELECT
    id, user_id, name, race, class, level, background, alignment, experience_points,
    strength, dexterity, constitution, intelligence, wisdom, charisma,
    max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
    skill_proficiencies, saving_throw_proficiencies, features, equipment,
    avatar_url, created_at, updated_at
FROM characters;

DROP TABLE characters;
ALTER TABLE characters_new RENAME TO characters;
CREATE INDEX idx_characters_user_id ON characters(user_id);

-- +goose Down
CREATE TABLE characters_old (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    race TEXT NOT NULL DEFAULT 'Human',
    class TEXT NOT NULL DEFAULT 'Fighter',
    level INTEGER NOT NULL DEFAULT 1,
    background TEXT DEFAULT '',
    alignment TEXT DEFAULT 'True Neutral',
    experience_points INTEGER DEFAULT 0,

    -- Ability scores
    strength INTEGER NOT NULL DEFAULT 10,
    dexterity INTEGER NOT NULL DEFAULT 10,
    constitution INTEGER NOT NULL DEFAULT 10,
    intelligence INTEGER NOT NULL DEFAULT 10,
    wisdom INTEGER NOT NULL DEFAULT 10,
    charisma INTEGER NOT NULL DEFAULT 10,

    -- Combat stats
    max_hp INTEGER NOT NULL DEFAULT 10,
    current_hp INTEGER NOT NULL DEFAULT 10,
    temp_hp INTEGER DEFAULT 0,
    armor_class INTEGER NOT NULL DEFAULT 10,
    speed INTEGER DEFAULT 30,
    hit_dice TEXT DEFAULT '1d8',

    -- JSON columns for flexible data
    skill_proficiencies TEXT DEFAULT '[]',
    saving_throw_proficiencies TEXT DEFAULT '[]',
    features TEXT DEFAULT '[]',
    equipment TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',

    avatar_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO characters_old (
    id, user_id, name, race, class, level, background, alignment, experience_points,
    strength, dexterity, constitution, intelligence, wisdom, charisma,
    max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
    skill_proficiencies, saving_throw_proficiencies, features, equipment, notes,
    avatar_url, created_at, updated_at
)
SELECT
    id, user_id, name, race, class, level, background, alignment, experience_points,
    strength, dexterity, constitution, intelligence, wisdom, charisma,
    max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
    skill_proficiencies, saving_throw_proficiencies, features, equipment, '' AS notes,
    avatar_url, created_at, updated_at
FROM characters;

DROP TABLE characters;
ALTER TABLE characters_old RENAME TO characters;
CREATE INDEX idx_characters_user_id ON characters(user_id);
