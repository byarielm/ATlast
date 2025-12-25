import { getDbClient } from "./DatabaseConnection";
import { DatabaseError } from "../../core/errors";
import { DbStatusRow } from "../../core/types";

export class DatabaseService {
  private sql = getDbClient();

  async initDatabase(): Promise<void> {
    try {
      console.log(
        "🧠 Connecting to DB:",
        process.env.NETLIFY_DATABASE_URL?.split("@")[1],
      );

      const res = (await this
        .sql`SELECT current_database() AS db, current_user AS user, NOW() AS now`) as DbStatusRow[];
      console.log("✅ Connected:", res[0]);

      await this.createTables();
      await this.createIndexes();

      console.log("✅ Database initialized successfully");
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      throw new DatabaseError(
        "Failed to initialize database",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  private async createTables(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS oauth_states (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS oauth_sessions (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id TEXT PRIMARY KEY,
        did TEXT NOT NULL,
        fingerprint JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `;

    await this.sql`
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

    await this.sql`
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

    await this.sql`
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

    await this.sql`
      CREATE TABLE IF NOT EXISTS atproto_matches (
        id SERIAL PRIMARY KEY,
        source_account_id INTEGER NOT NULL REFERENCES source_accounts(id) ON DELETE CASCADE,
        atproto_did TEXT NOT NULL,
        atproto_handle TEXT NOT NULL,
        atproto_display_name TEXT,
        atproto_avatar TEXT,
        atproto_description TEXT,
        post_count INTEGER,
        follower_count INTEGER,
        match_score INTEGER NOT NULL,
        found_at TIMESTAMP DEFAULT NOW(),
        last_verified TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        follow_status JSONB DEFAULT '{}',
        last_follow_check TIMESTAMP,
        UNIQUE(source_account_id, atproto_did)
      )
    `;

    await this.sql`
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

    await this.sql`
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
  }

  private async createIndexes(): Promise<void> {
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_source_accounts_to_check ON source_accounts(source_platform, match_found, last_checked)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_source_accounts_platform ON source_accounts(source_platform)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_source_follows_did ON user_source_follows(did)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_source_follows_source ON user_source_follows(source_account_id)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_atproto_matches_source ON atproto_matches(source_account_id)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_atproto_matches_did ON atproto_matches(atproto_did)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_match_status_did_notified ON user_match_status(did, notified, viewed)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_match_status_did_followed ON user_match_status(did, followed)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON notification_queue(sent, created_at) WHERE sent = false`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_atproto_matches_stats ON atproto_matches(source_account_id, found_at DESC, post_count DESC, follower_count DESC)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_did ON user_sessions(did)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires ON oauth_sessions(expires_at)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_uploads_did_created ON user_uploads(did, created_at DESC)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_source_follows_upload_created ON user_source_follows(upload_id, source_account_id)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_user_match_status_match_id ON user_match_status(atproto_match_id)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_atproto_matches_source_active ON atproto_matches(source_account_id, is_active) WHERE is_active = true`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_source_accounts_normalized ON source_accounts(normalized_username, source_platform)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_atproto_matches_follow_status ON atproto_matches USING gin(follow_status)`;
    await this
      .sql`CREATE INDEX IF NOT EXISTS idx_atproto_matches_follow_check ON atproto_matches(last_follow_check)`;

    console.log("✅ Database indexes created/verified");
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      const statesDeleted = await this
        .sql`DELETE FROM oauth_states WHERE expires_at < ${new Date().toISOString()}`;
      const sessionsDeleted = await this
        .sql`DELETE FROM oauth_sessions WHERE expires_at < ${new Date().toISOString()}`;
      const userSessionsDeleted = await this
        .sql`DELETE FROM user_sessions WHERE expires_at < ${new Date().toISOString()}`;

      console.log("🧹 Cleanup:", {
        states: (statesDeleted as any).length,
        sessions: (sessionsDeleted as any).length,
        userSessions: (userSessionsDeleted as any).length,
      });
    } catch (error) {
      throw new DatabaseError(
        "Failed to cleanup expired sessions",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }
}
