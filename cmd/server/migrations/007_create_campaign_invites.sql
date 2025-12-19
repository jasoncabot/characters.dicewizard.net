-- +goose Up
CREATE TABLE campaign_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    invited_by INTEGER NOT NULL,
    role_default TEXT NOT NULL DEFAULT 'viewer' CHECK (role_default IN ('viewer','editor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
    expires_at DATETIME NOT NULL,
    redeemed_by INTEGER,
    redeemed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_campaign_invites_campaign ON campaign_invites(campaign_id);
CREATE INDEX idx_campaign_invites_code ON campaign_invites(code);

-- +goose Down
DROP TABLE IF EXISTS campaign_invites;
