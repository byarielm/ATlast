import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<any, any> | undefined = undefined;

/**
 * Gets or initializes the Neon database client.
 * This pattern ensures a fresh client is created for each cold start,
 * preventing stale connections in the serverless environment.
 */
export function getDbClient() {
  if (!sql) {
    // The connection string can be configured with pgbouncer=true if needed,
    // but the @neondatabase/serverless driver typically handles this.
    sql = neon(process.env.NETLIFY_DATABASE_URL!);
  }
  return sql;
}

/**
 * Initializes database tables if they don't already exist.
 * Safe to run multiple times (idempotent).
 */
export async function initDB() {
  const sql = getDbClient();

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
}

/**
 * Cleans up expired entries in the database.
 * Can be safely called periodically (e.g., in a cron job or scheduled Netlify Function).
 */
export async function cleanupExpiredSessions() {
  const sql = getDbClient();

  await sql`DELETE FROM oauth_states WHERE expires_at < NOW()`;
  await sql`DELETE FROM oauth_sessions WHERE expires_at < NOW()`;
  await sql`DELETE FROM user_sessions WHERE expires_at < NOW()`;
}

/**
 * Exports a getter instead of a direct SQL client to handle serverless environments properly.
 */
export { getDbClient as sql };