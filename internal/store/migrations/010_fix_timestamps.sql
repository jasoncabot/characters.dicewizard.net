-- +goose Up
-- +goose NO TRANSACTION
PRAGMA foreign_keys=OFF;

-- Users
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO users_new (id, username, password_hash, created_at)
SELECT id, username, password_hash, COALESCE(created_at, CURRENT_TIMESTAMP) FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
CREATE INDEX idx_users_username ON users(username);

-- Characters
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
    strength INTEGER NOT NULL DEFAULT 10,
    dexterity INTEGER NOT NULL DEFAULT 10,
    constitution INTEGER NOT NULL DEFAULT 10,
    intelligence INTEGER NOT NULL DEFAULT 10,
    wisdom INTEGER NOT NULL DEFAULT 10,
    charisma INTEGER NOT NULL DEFAULT 10,
    max_hp INTEGER NOT NULL DEFAULT 10,
    current_hp INTEGER NOT NULL DEFAULT 10,
    temp_hp INTEGER DEFAULT 0,
    armor_class INTEGER NOT NULL DEFAULT 10,
    speed INTEGER DEFAULT 30,
    hit_dice TEXT DEFAULT '',
    skill_proficiencies TEXT DEFAULT '[]',
    saving_throw_proficiencies TEXT DEFAULT '[]',
    features TEXT DEFAULT '[]',
    equipment TEXT DEFAULT '[]',
    avatar_url TEXT DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO characters_new (id, user_id, name, race, class, level, background, alignment, experience_points, strength, dexterity, constitution, intelligence, wisdom, charisma, max_hp, current_hp, temp_hp, armor_class, speed, hit_dice, skill_proficiencies, saving_throw_proficiencies, features, equipment, avatar_url, created_at, updated_at)
SELECT id, user_id, name, race, class, level, background, alignment, experience_points, strength, dexterity, constitution, intelligence, wisdom, charisma, max_hp, current_hp, temp_hp, armor_class, speed, hit_dice, skill_proficiencies, saving_throw_proficiencies, features, equipment, avatar_url, COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP) FROM characters;
DROP TABLE characters;
ALTER TABLE characters_new RENAME TO characters;
CREATE INDEX idx_characters_user ON characters(user_id);

-- Campaigns
CREATE TABLE campaigns_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','invite')),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','paused','completed','archived')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO campaigns_new (id, owner_id, name, description, visibility, status, created_at, updated_at)
SELECT id, owner_id, name, description, visibility, status, COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP) FROM campaigns;
DROP TABLE campaigns;
ALTER TABLE campaigns_new RENAME TO campaigns;
CREATE INDEX idx_campaigns_owner ON campaigns(owner_id);

-- Campaign Members
CREATE TABLE campaign_members_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner','editor','viewer')),
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending','accepted','revoked')),
    invited_by INTEGER DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET DEFAULT
);
INSERT INTO campaign_members_new (id, campaign_id, user_id, role, status, invited_by, created_at)
SELECT id, campaign_id, user_id, role, status, invited_by, COALESCE(created_at, CURRENT_TIMESTAMP) FROM campaign_members;
DROP TABLE campaign_members;
ALTER TABLE campaign_members_new RENAME TO campaign_members;
CREATE INDEX idx_campaign_members_campaign ON campaign_members(campaign_id);
CREATE INDEX idx_campaign_members_user ON campaign_members(user_id);
CREATE UNIQUE INDEX idx_campaign_members_unique ON campaign_members(campaign_id, user_id);
-- Campaign Characters
CREATE TABLE campaign_characters_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE (campaign_id, character_id)
);
INSERT INTO campaign_characters_new (id, campaign_id, character_id, created_at)
SELECT id, campaign_id, character_id, COALESCE(created_at, CURRENT_TIMESTAMP) FROM campaign_characters;
DROP TABLE campaign_characters;
ALTER TABLE campaign_characters_new RENAME TO campaign_characters;
CREATE INDEX idx_campaign_characters_campaign ON campaign_characters(campaign_id);

-- Scenes
CREATE TABLE scenes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    ordering INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO scenes_new (id, campaign_id, name, description, ordering, is_active, created_by, created_at, updated_at)
SELECT id, campaign_id, name, description, ordering, is_active, created_by, COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP) FROM scenes;
DROP TABLE scenes;
ALTER TABLE scenes_new RENAME TO scenes;
CREATE INDEX idx_scenes_campaign ON scenes(campaign_id);

-- Maps
CREATE TABLE maps_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'Map',
    base_image_url TEXT,
    grid_size_ft INTEGER NOT NULL DEFAULT 5,
    width_px INTEGER,
    height_px INTEGER,
    lighting_mode TEXT NOT NULL DEFAULT 'none',
    fog_state TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);
INSERT INTO maps_new (id, scene_id, name, base_image_url, grid_size_ft, width_px, height_px, lighting_mode, fog_state, created_at)
SELECT id, scene_id, name, base_image_url, grid_size_ft, width_px, height_px, lighting_mode, fog_state, COALESCE(created_at, CURRENT_TIMESTAMP) FROM maps;
DROP TABLE maps;
ALTER TABLE maps_new RENAME TO maps;
CREATE INDEX idx_maps_scene ON maps(scene_id);

-- Tokens
CREATE TABLE tokens_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id INTEGER NOT NULL,
    character_id INTEGER,
    label TEXT NOT NULL,
    image_url TEXT,
    size_squares INTEGER NOT NULL DEFAULT 1,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    facing_deg INTEGER NOT NULL DEFAULT 0,
    audience TEXT NOT NULL DEFAULT '["gm-only"]',
    tags TEXT NOT NULL DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_by INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO tokens_new (id, map_id, character_id, label, image_url, size_squares, position_x, position_y, facing_deg, audience, tags, notes, created_by, created_at)
SELECT id, map_id, character_id, label, image_url, size_squares, position_x, position_y, facing_deg, audience, tags, notes, created_by, COALESCE(created_at, CURRENT_TIMESTAMP) FROM tokens;
DROP TABLE tokens;
ALTER TABLE tokens_new RENAME TO tokens;
CREATE INDEX idx_tokens_map ON tokens(map_id);
-- Notes
CREATE TABLE notes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'general',
    entity_id INTEGER,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO notes_new (id, user_id, entity_type, entity_id, title, body, created_at, updated_at)
SELECT id, user_id, entity_type, entity_id, title, body, COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP) FROM notes;
DROP TABLE notes;
ALTER TABLE notes_new RENAME TO notes;
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);

-- +goose StatementBegin
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO note_fts(rowid, title, body, entity_type) VALUES (new.id, new.title, new.body, new.entity_type);
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO note_fts(note_fts, rowid, title, body, entity_type) VALUES ('delete', old.id, old.title, old.body, old.entity_type);
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO note_fts(note_fts, rowid, title, body, entity_type) VALUES ('delete', old.id, old.title, old.body, old.entity_type);
  INSERT INTO note_fts(rowid, title, body, entity_type) VALUES (new.id, new.title, new.body, new.entity_type);
END;
-- +goose StatementEnd

-- Campaign Invites
CREATE TABLE campaign_invites_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    invited_by INTEGER NOT NULL,
    role_default TEXT NOT NULL DEFAULT 'viewer' CHECK (role_default IN ('viewer','editor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
    expires_at DATETIME NOT NULL,
    redeemed_by INTEGER,
    redeemed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO campaign_invites_new (id, campaign_id, code, invited_by, role_default, status, expires_at, redeemed_by, redeemed_at, created_at)
SELECT id, campaign_id, code, invited_by, role_default, status, expires_at, redeemed_by, redeemed_at, COALESCE(created_at, CURRENT_TIMESTAMP) FROM campaign_invites;
DROP TABLE campaign_invites;
ALTER TABLE campaign_invites_new RENAME TO campaign_invites;
CREATE INDEX idx_campaign_invites_campaign ON campaign_invites(campaign_id);
CREATE INDEX idx_campaign_invites_code ON campaign_invites(code);

PRAGMA foreign_keys=ON;

-- +goose Down
-- No down migration provided as this is a fix-forward migration.
