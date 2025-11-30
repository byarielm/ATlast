import { getDbClient } from "../../database/connection";
import { UserSessionData, UserSessionRow } from "../../../types";
import { CONFIG } from "../../../constants";

export class PostgresUserSessionStore {
  private sql = getDbClient();

  async get(sessionId: string): Promise<UserSessionData | undefined> {
    const result = await this.sql`
      SELECT did FROM user_sessions
      WHERE session_id = ${sessionId} AND expires_at > NOW()
    `;
    const rows = result as UserSessionRow[];
    return rows[0] ? { did: rows[0].did } : undefined;
  }

  async set(sessionId: string, data: UserSessionData): Promise<void> {
    const expiresAt = new Date(Date.now() + CONFIG.SESSION_EXPIRY);
    await this.sql`
      INSERT INTO user_sessions (session_id, did, expires_at)
      VALUES (${sessionId}, ${data.did}, ${expiresAt})
      ON CONFLICT (session_id) DO UPDATE SET
        did = ${data.did},
        expires_at = ${expiresAt}
    `;
  }

  async del(sessionId: string): Promise<void> {
    await this.sql`DELETE FROM user_sessions WHERE session_id = ${sessionId}`;
  }
}
