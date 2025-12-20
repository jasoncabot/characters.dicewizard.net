-- +goose Up
ALTER TABLE campaigns ADD COLUMN status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','paused','completed','archived'));
UPDATE campaigns SET status = 'not_started' WHERE status IS NULL;

-- +goose Down
CREATE TABLE campaigns_tmp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','invite')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO campaigns_tmp (id, owner_id, name, description, visibility, created_at, updated_at)
    SELECT id, owner_id, name, description, visibility, created_at, updated_at FROM campaigns;
DROP TABLE campaigns;
ALTER TABLE campaigns_tmp RENAME TO campaigns;
