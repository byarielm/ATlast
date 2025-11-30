import { getDbClient } from "../../database/connection";
import { SessionData, OAuthSessionRow } from "../../../types";
import { CONFIG } from "../../../constants";

export class PostgresSessionStore {
  private sql = getDbClient();

  async get(key: string): Promise<SessionData | undefined> {
    const result = await this.sql`
      SELECT data FROM oauth_sessions
      WHERE key = ${key} AND expires_at > NOW()
    `;
    const rows = result as OAuthSessionRow[];
    return rows[0]?.data as SessionData | undefined;
  }

  async set(key: string, value: SessionData): Promise<void> {
    const expiresAt = new Date(Date.now() + CONFIG.SESSION_EXPIRY);
    await this.sql`
      INSERT INTO oauth_sessions (key, data, expires_at)
      VALUES (${key}, ${JSON.stringify(value)}, ${expiresAt})
      ON CONFLICT (key) DO UPDATE SET
        data = ${JSON.stringify(value)},
        expires_at = ${expiresAt}
    `;
  }

  async del(key: string): Promise<void> {
    await this.sql`DELETE FROM oauth_sessions WHERE key = ${key}`;
  }
}
