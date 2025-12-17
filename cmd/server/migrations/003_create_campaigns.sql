-- +goose Up
CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','invite')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE campaign_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner','editor','viewer')),
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending','accepted','revoked')),
    invited_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (campaign_id, user_id)
);

CREATE TABLE campaign_characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE (campaign_id, character_id)
);

CREATE TABLE scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    ordering INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'Map',
    base_image_url TEXT,
    grid_size_ft INTEGER NOT NULL DEFAULT 5,
    width_px INTEGER,
    height_px INTEGER,
    lighting_mode TEXT NOT NULL DEFAULT 'none',
    fog_state TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

CREATE TABLE layers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'background',
    z_index INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);

CREATE TABLE tokens (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX idx_campaign_members_campaign ON campaign_members(campaign_id);
CREATE INDEX idx_campaign_members_user ON campaign_members(user_id);
CREATE INDEX idx_campaign_characters_campaign ON campaign_characters(campaign_id);
CREATE INDEX idx_scenes_campaign ON scenes(campaign_id);
CREATE INDEX idx_maps_scene ON maps(scene_id);
CREATE INDEX idx_tokens_map ON tokens(map_id);

-- +goose Down
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS layers;
DROP TABLE IF EXISTS maps;
DROP TABLE IF EXISTS scenes;
DROP TABLE IF EXISTS campaign_characters;
DROP TABLE IF EXISTS campaign_members;
DROP TABLE IF EXISTS campaigns;
