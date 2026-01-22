-- ATlast Database Schema
-- Migration Plan v2.0 - Phase 1
-- Self-hosted PostgreSQL schema with fuzzy matching support

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy matching

-- OAuth state storage (transient)
CREATE TABLE oauth_states (
    state TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_oauth_states_created ON oauth_states(created_at);

-- OAuth sessions (transient)
CREATE TABLE oauth_sessions (
    did TEXT PRIMARY KEY,
    session_data JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions (transient)
CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    did TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_user_sessions_did ON user_sessions(did);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- User uploads (persistent)
CREATE TABLE user_uploads (
    upload_id TEXT PRIMARY KEY,
    user_did TEXT NOT NULL,
    source_platform TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    total_users INTEGER DEFAULT 0,
    matched_users INTEGER DEFAULT 0,
    unmatched_users INTEGER DEFAULT 0
);
CREATE INDEX idx_user_uploads_user_did ON user_uploads(user_did);
-- Note: check_frequency and last_checked removed - no periodic checking in Phase 1

-- Source accounts (persistent)
CREATE TABLE source_accounts (
    id SERIAL PRIMARY KEY,
    source_platform TEXT NOT NULL,
    original_username TEXT NOT NULL,
    normalized_username TEXT NOT NULL,
    date_on_source TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_platform, normalized_username)
);
CREATE INDEX idx_source_accounts_normalized ON source_accounts
    USING gin(normalized_username gin_trgm_ops);  -- Fuzzy matching!
CREATE INDEX idx_source_accounts_platform ON source_accounts(source_platform);

-- User-source follows (join table)
CREATE TABLE user_source_follows (
    user_did TEXT NOT NULL,
    upload_id TEXT NOT NULL REFERENCES user_uploads(upload_id) ON DELETE CASCADE,
    source_account_id INTEGER NOT NULL REFERENCES source_accounts(id),
    found_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (upload_id, source_account_id)
);
CREATE INDEX idx_user_source_follows_user ON user_source_follows(user_did);
CREATE INDEX idx_user_source_follows_source ON user_source_follows(source_account_id);

-- AT Protocol matches (persistent)
CREATE TABLE atproto_matches (
    id SERIAL PRIMARY KEY,
    source_account_id INTEGER NOT NULL REFERENCES source_accounts(id),
    atproto_did TEXT NOT NULL,
    atproto_handle TEXT NOT NULL,
    display_name TEXT,
    match_score INTEGER NOT NULL,
    post_count INTEGER,
    follower_count INTEGER,
    follow_status JSONB DEFAULT '{}',
    found_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_account_id, atproto_did)
);
CREATE INDEX idx_atproto_matches_source ON atproto_matches(source_account_id);
CREATE INDEX idx_atproto_matches_did ON atproto_matches(atproto_did);
CREATE INDEX idx_atproto_matches_score ON atproto_matches(match_score DESC);

-- User match status (persistent)
CREATE TABLE user_match_status (
    user_did TEXT NOT NULL,
    match_id INTEGER NOT NULL REFERENCES atproto_matches(id),
    viewed BOOLEAN DEFAULT FALSE,
    dismissed BOOLEAN DEFAULT FALSE,
    followed BOOLEAN DEFAULT FALSE,
    notified BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_did, match_id)
);
CREATE INDEX idx_user_match_status_user ON user_match_status(user_did);
CREATE INDEX idx_user_match_status_notified ON user_match_status(user_did, notified)
    WHERE notified = FALSE;

-- Notification queue (transient - for Phase 2)
CREATE TABLE notification_queue (
    id SERIAL PRIMARY KEY,
    user_did TEXT NOT NULL,
    match_id INTEGER NOT NULL REFERENCES atproto_matches(id),
    notification_type TEXT NOT NULL, -- 'in_app', 'bluesky_dm', 'partner_api'
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP,
    error_message TEXT,  -- Store error details for debugging
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notification_queue_status ON notification_queue(status)
    WHERE status = 'pending';
CREATE INDEX idx_notification_queue_user ON notification_queue(user_did);

-- Partner API keys (for Phase 2)
CREATE TABLE partner_api_keys (
    id SERIAL PRIMARY KEY,
    partner_name TEXT NOT NULL,  -- 'skylight', 'spark', etc.
    api_key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hashed API key
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_partner_api_keys_hash ON partner_api_keys(api_key_hash)
    WHERE is_active = TRUE;

-- Cleanup function for old transient data
CREATE OR REPLACE FUNCTION cleanup_transient_data() RETURNS void AS $$
BEGIN
    -- Clean expired OAuth states (1 hour)
    DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '1 hour';

    -- Clean expired sessions
    DELETE FROM user_sessions WHERE expires_at < NOW();

    -- Clean old sent notifications (7 days)
    DELETE FROM notification_queue
    WHERE status = 'sent' AND created_at < NOW() - INTERVAL '7 days';

    -- Clean old failed notifications (30 days)
    DELETE FROM notification_queue
    WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
