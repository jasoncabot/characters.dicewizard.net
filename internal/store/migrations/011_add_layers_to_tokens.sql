-- +goose Up
-- +goose NO TRANSACTION
PRAGMA foreign_keys=OFF;

-- 1. Update Campaigns to track the Active Scene
CREATE TABLE campaigns_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','invite')),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','paused','completed','archived')),
    active_scene_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (active_scene_id) REFERENCES scenes(id) ON DELETE SET NULL
);

INSERT INTO campaigns_new (id, owner_id, name, description, visibility, status, active_scene_id, created_at, updated_at)
SELECT id, owner_id, name, description, visibility, status, NULL, created_at, updated_at FROM campaigns;

DROP TABLE campaigns;
ALTER TABLE campaigns_new RENAME TO campaigns;
CREATE INDEX idx_campaigns_owner ON campaigns(owner_id);

-- 2. Update Tokens to support Layers (Z-Index)
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
    layer TEXT NOT NULL DEFAULT 'token' CHECK (layer IN ('map', 'object', 'token', 'gm')),
    created_by INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO tokens_new (id, map_id, character_id, label, image_url, size_squares, position_x, position_y, facing_deg, audience, tags, notes, layer, created_by, created_at)
SELECT id, map_id, character_id, label, image_url, size_squares, position_x, position_y, facing_deg, audience, tags, notes, 'token', created_by, created_at FROM tokens;

DROP TABLE tokens;
ALTER TABLE tokens_new RENAME TO tokens;
CREATE INDEX idx_tokens_map ON tokens(map_id);

PRAGMA foreign_keys=ON;

-- +goose Down
-- No down migration provided as this is a fix-forward migration.
