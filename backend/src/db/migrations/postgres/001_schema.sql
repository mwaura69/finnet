

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL  UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE TABLE IF NOT EXISTS portfolios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
  client_name TEXT NOT NULL CHECK(length(client_name) BETWEEN 2 AND 100),
  base_currency TEXT NOT NULL CHECK(base_currency IN ('KES','USD')),
  created_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('BUY','SELL')),
  quantity DOUBLE PRECISION NOT NULL CHECK(quantity > 0),
  unit_price_minor BIGINT NOT NULL CHECK(unit_price_minor > 0),
  trade_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_portfolio_owner ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ledger ON transactions(portfolio_id, trade_date, created_at, id);


ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN email_verified BIGINT NOT NULL DEFAULT 0 CHECK(email_verified IN (0,1));
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'analyst' CHECK(role IN ('admin','analyst','viewer'));
ALTER TABLE users ADD COLUMN email_mfa_enabled BIGINT NOT NULL DEFAULT 0 CHECK(email_mfa_enabled IN (0,1));
ALTER TABLE users ADD COLUMN transaction_emails BIGINT NOT NULL DEFAULT 1 CHECK(transaction_emails IN (0,1));
ALTER TABLE users ADD COLUMN product_emails BIGINT NOT NULL DEFAULT 0 CHECK(product_emails IN (0,1));
ALTER TABLE users ADD COLUMN onboarding_completed BIGINT NOT NULL DEFAULT 0 CHECK(onboarding_completed IN (0,1));
ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
ALTER TABLE users ADD COLUMN terms_version TEXT;
CREATE UNIQUE INDEX users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
UPDATE users SET email_verified=1,terms_accepted_at=created_at,terms_version='2026-11-24' WHERE email='demo@fintrack.local';
CREATE TABLE auth_tokens(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset','set')),token_hash TEXT NOT NULL UNIQUE,expires_at BIGINT NOT NULL,consumed_at BIGINT,created_at BIGINT NOT NULL);
CREATE INDEX auth_tokens_lookup ON auth_tokens(user_id,purpose,consumed_at);
CREATE TABLE sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at BIGINT NOT NULL,last_seen_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,revoked_at BIGINT,stay_logged_in BIGINT NOT NULL DEFAULT 0,mfa_verified_at BIGINT);
CREATE INDEX sessions_owner ON sessions(user_id,revoked_at);
CREATE TABLE refresh_tokens(token_hash TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,expires_at BIGINT NOT NULL,consumed_at BIGINT,created_at BIGINT NOT NULL);
CREATE INDEX refresh_session ON refresh_tokens(session_id);
CREATE TABLE mfa_challenges(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,purpose TEXT NOT NULL CHECK(purpose IN ('login','enable')),session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,code_hash TEXT NOT NULL,expires_at BIGINT NOT NULL,attempts BIGINT NOT NULL DEFAULT 0,consumed_at BIGINT,last_sent_at BIGINT NOT NULL,stay_logged_in BIGINT NOT NULL DEFAULT 0);
CREATE INDEX mfa_owner ON mfa_challenges(user_id,purpose,consumed_at);

ALTER TABLE transactions ADD COLUMN created_by TEXT REFERENCES users(id);
CREATE TABLE IF NOT EXISTS portfolio_members (
 portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 permission TEXT NOT NULL CHECK(permission IN ('read','write')),
 granted_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
 PRIMARY KEY(portfolio_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_member_user ON portfolio_members(user_id,portfolio_id);
CREATE TABLE IF NOT EXISTS notification_outbox (
 id TEXT PRIMARY KEY,event_key TEXT NOT NULL,
 recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient_email TEXT NOT NULL,subject TEXT NOT NULL,text_body TEXT NOT NULL,html_body TEXT NOT NULL,
 attempts BIGINT NOT NULL DEFAULT 0,next_attempt_at TEXT NOT NULL,locked_until TEXT,sent_at TEXT,last_error TEXT,created_at TEXT NOT NULL,
 UNIQUE(event_key,recipient_user_id)
);
CREATE INDEX IF NOT EXISTS idx_outbox_due ON notification_outbox(sent_at,next_attempt_at,locked_until);

CREATE UNIQUE INDEX users_email_lower ON users(lower(email));

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
