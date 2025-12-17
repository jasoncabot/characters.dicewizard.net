-- +goose Up
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'general',
    entity_id INTEGER,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);

CREATE VIRTUAL TABLE note_fts USING fts5(
    title,
    body,
    entity_type,
    content='notes',
    content_rowid='id'
);

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

-- +goose Down
DROP TRIGGER IF EXISTS notes_au;
DROP TRIGGER IF EXISTS notes_ad;
DROP TRIGGER IF EXISTS notes_ai;
DROP TABLE IF EXISTS note_fts;
DROP TABLE IF EXISTS notes;
