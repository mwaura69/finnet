ALTER TABLE transactions ADD COLUMN created_by TEXT REFERENCES users(id);
CREATE TABLE IF NOT EXISTS portfolio_members (
 portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 permission TEXT NOT NULL CHECK(permission IN ('read','write')),
 granted_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(portfolio_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_member_user ON portfolio_members(user_id,portfolio_id);
CREATE TABLE IF NOT EXISTS notification_outbox (
 id TEXT PRIMARY KEY,event_key TEXT NOT NULL,
 recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient_email TEXT NOT NULL,subject TEXT NOT NULL,text_body TEXT NOT NULL,html_body TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT NOT NULL,locked_until TEXT,sent_at TEXT,last_error TEXT,created_at TEXT NOT NULL,
 UNIQUE(event_key,recipient_user_id)
);
CREATE INDEX IF NOT EXISTS idx_outbox_due ON notification_outbox(sent_at,next_attempt_at,locked_until);
