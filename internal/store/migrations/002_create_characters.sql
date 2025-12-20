-- +goose Up
CREATE TABLE characters (
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
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_characters_user_id ON characters(user_id);

-- +goose Down
DROP TABLE characters;
