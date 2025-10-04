import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Initialize database tables
export async function initDB() {
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
      handle TEXT,
      service_endpoint TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      tokens JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    )
  `;

  // Clean up expired entries
  await sql`DELETE FROM oauth_states WHERE expires_at < NOW()`;
  await sql`DELETE FROM oauth_sessions WHERE expires_at < NOW()`;
  await sql`DELETE FROM user_sessions WHERE expires_at < NOW()`;
}

export { sql };