import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<any, any> | undefined = undefined;

export function getDbClient() {
  if (!sql) {
    sql = neon(process.env.NETLIFY_DATABASE_URL!);
  }
  return sql;
}

export async function initDB() {
  const sql = getDbClient();

  console.log('🧠 Connecting to DB:', process.env.NETLIFY_DATABASE_URL);

  try {
    const res: any = await sql`SELECT current_database() AS db, current_user AS user, NOW() AS now`;
    console.log('✅ Connected:', res[0]);
  } catch (e) {
    console.error('❌ Connection failed:', e);
    throw e;
  }

  // OAuth Tables
  await sql`
    CREATE TABLE IF NOT EXISTS oauth_states (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS oauth_sessions (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id TEXT PRIMARY KEY,
      did TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    )
  `;

  // User + Match Tracking
  await sql`
    CREATE TABLE IF NOT EXISTS user_uploads (
      upload_id TEXT PRIMARY KEY,
      did TEXT NOT NULL,
      source_platform TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      last_checked TIMESTAMP,
      total_users INTEGER NOT NULL,
      matched_users INTEGER DEFAULT 0,
      unmatched_users INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS source_accounts (
      id SERIAL PRIMARY KEY,
      source_platform TEXT NOT NULL,
      source_username TEXT NOT NULL,
      normalized_username TEXT NOT NULL,
      last_checked TIMESTAMP,
      match_found BOOLEAN DEFAULT FALSE,
      match_found_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(source_platform, normalized_username)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_source_follows (
      id SERIAL PRIMARY KEY,
      upload_id TEXT NOT NULL REFERENCES user_uploads(upload_id) ON DELETE CASCADE,
      did TEXT NOT NULL,
      source_account_id INTEGER NOT NULL REFERENCES source_accounts(id) ON DELETE CASCADE,
      source_date TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(upload_id, source_account_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS atproto_matches (
      id SERIAL PRIMARY KEY,
      source_account_id INTEGER NOT NULL REFERENCES source_accounts(id) ON DELETE CASCADE,
      atproto_did TEXT NOT NULL,
      atproto_handle TEXT NOT NULL,
      atproto_display_name TEXT,
      atproto_avatar TEXT,
      match_score INTEGER NOT NULL,
      found_at TIMESTAMP DEFAULT NOW(),
      last_verified TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      UNIQUE(source_account_id, atproto_did)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_match_status (
      id SERIAL PRIMARY KEY,
      did TEXT NOT NULL,
      atproto_match_id INTEGER NOT NULL REFERENCES atproto_matches(id) ON DELETE CASCADE,
      source_account_id INTEGER NOT NULL REFERENCES source_accounts(id) ON DELETE CASCADE,
      notified BOOLEAN DEFAULT FALSE,
      notified_at TIMESTAMP,
      viewed BOOLEAN DEFAULT FALSE,
      viewed_at TIMESTAMP,
      followed BOOLEAN DEFAULT FALSE,
      followed_at TIMESTAMP,
      dismissed BOOLEAN DEFAULT FALSE,
      dismissed_at TIMESTAMP,
      UNIQUE(did, atproto_match_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notification_queue (
      id SERIAL PRIMARY KEY,
      did TEXT NOT NULL,
      new_matches_count INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      sent BOOLEAN DEFAULT FALSE,
      sent_at TIMESTAMP,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT
    )
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_source_accounts_to_check ON source_accounts(source_platform, match_found, last_checked)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_source_accounts_platform ON source_accounts(source_platform)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_source_follows_did ON user_source_follows(did)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_source_follows_source ON user_source_follows(source_account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_atproto_matches_source ON atproto_matches(source_account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_atproto_matches_did ON atproto_matches(atproto_did)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_match_status_did_notified ON user_match_status(did, notified, viewed)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_match_status_did_followed ON user_match_status(did, followed)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON notification_queue(sent, created_at) WHERE sent = FALSE`;
}

export async function cleanupExpiredSessions() {
  const sql = getDbClient();
  await sql`DELETE FROM oauth_states WHERE expires_at < NOW()`;
  await sql`DELETE FROM oauth_sessions WHERE expires_at < NOW()`;
  await sql`DELETE FROM user_sessions WHERE expires_at < NOW()`;
}

export { getDbClient as sql };