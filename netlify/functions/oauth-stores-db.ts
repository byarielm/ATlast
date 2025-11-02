import { getDbClient } from './db';

interface StateData {
  dpopKey: any;
  verifier: string;
  appState?: string;
}

interface SessionData {
  dpopKey: any;
  tokenSet: any;
}

// Reuse the same DB client across all store instances
const sql = getDbClient();

export class PostgresStateStore {
  async get(key: string): Promise<StateData | undefined> {
    const result = await sql`
      SELECT data FROM oauth_states 
      WHERE key = ${key} AND expires_at > NOW()
    `;
    return (result as Record<string, any>[])[0]?.data as StateData | undefined;
  }

  async set(key: string, value: StateData): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await sql`
      INSERT INTO oauth_states (key, data, expires_at)
      VALUES (${key}, ${JSON.stringify(value)}, ${expiresAt.toISOString()})
      ON CONFLICT (key) DO UPDATE SET data = ${JSON.stringify(value)}, expires_at = ${expiresAt.toISOString()}
    `;
  }

  async del(key: string): Promise<void> {
    await sql`DELETE FROM oauth_states WHERE key = ${key}`;
  }
}

export class PostgresSessionStore {
  async get(key: string): Promise<SessionData | undefined> {
    const result = await sql`
      SELECT data FROM oauth_sessions 
      WHERE key = ${key} AND expires_at > NOW()
    `;
    return (result as Record<string, any>[])[0]?.data as SessionData | undefined;
  }

  async set(key: string, value: SessionData): Promise<void> {
    // Session includes tokens, DPoP keys, etc.
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    await sql`
      INSERT INTO oauth_sessions (key, data, expires_at)
      VALUES (${key}, ${JSON.stringify(value)}, ${expiresAt})
      ON CONFLICT (key) DO UPDATE SET data = ${JSON.stringify(value)}, expires_at = ${expiresAt}
    `;
  }

  async del(key: string): Promise<void> {
    await sql`DELETE FROM oauth_sessions WHERE key = ${key}`;
  }
}

export class PostgresUserSessionStore {
  async get(sessionId: string): Promise<{ did: string } | undefined> {
    const result = await sql`
      SELECT did FROM user_sessions 
      WHERE session_id = ${sessionId} AND expires_at > NOW()
    `;
    const row = (result as Record<string, any>[])[0];
    return row ? { did: row.did } : undefined;
  }

  async set(sessionId: string, data: { did: string }): Promise<void> {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    await sql`
      INSERT INTO user_sessions (session_id, did, expires_at)
      VALUES (${sessionId}, ${data.did}, ${expiresAt})
      ON CONFLICT (session_id) DO UPDATE SET
        did = ${data.did},
        expires_at = ${expiresAt}
    `;
  }

  async del(sessionId: string): Promise<void> {
    await sql`DELETE FROM user_sessions WHERE session_id = ${sessionId}`;
  }
}

export const stateStore = new PostgresStateStore();
export const sessionStore = new PostgresSessionStore();
export const userSessions = new PostgresUserSessionStore();