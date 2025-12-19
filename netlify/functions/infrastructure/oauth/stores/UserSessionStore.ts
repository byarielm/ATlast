import { getDbClient } from "../../database";
import { UserSessionData, UserSessionRow } from "../../../core/types";
import { CONFIG } from "../../../core/config/constants";

export class PostgresUserSessionStore {
  private sql = getDbClient();

  async get(sessionId: string): Promise<UserSessionData | undefined> {
    const result = await this.sql`
      SELECT did, fingerprint FROM user_sessions
      WHERE session_id = ${sessionId} AND expires_at > NOW()
    `;
    const rows = result as UserSessionRow[];
    return rows[0]
      ? { did: rows[0].did, fingerprint: rows[0].fingerprint }
      : undefined;
  }

  async set(sessionId: string, data: UserSessionData): Promise<void> {
    const expiresAt = new Date(Date.now() + CONFIG.SESSION_EXPIRY);
    await this.sql`
      INSERT INTO user_sessions (session_id, did, fingerprint, expires_at)
      VALUES (${sessionId}, ${data.did}, ${JSON.stringify(data.fingerprint)}, ${expiresAt})
      ON CONFLICT (session_id) DO UPDATE SET
        did = ${data.did},
        fingerprint = ${JSON.stringify(data.fingerprint)},
        expires_at = ${expiresAt}
    `;
  }

  async del(sessionId: string): Promise<void> {
    await this.sql`DELETE FROM user_sessions WHERE session_id = ${sessionId}`;
  }
}
