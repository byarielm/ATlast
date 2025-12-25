import { getDbClient } from "../../database";
import { UserSessionData, UserSessionRow } from "../../../core/types";
import { CONFIG } from "../../../core/config/constants";

export class PostgresUserSessionStore {
  private sql = getDbClient();

  async get(sessionId: string): Promise<UserSessionData | undefined> {
    const fetchSession = async () => {
      const result = await this.sql`
            SELECT did FROM user_sessions
            WHERE session_id = ${sessionId} AND expires_at > ${new Date().toISOString()}
          `;
      const rows = result as UserSessionRow[];
      return rows[0] ? { did: rows[0].did } : undefined;
    };

    // Try once, if not found retry twice with small delays
    let session = await fetchSession();

    if (!session) {
      console.log(
        `[UserSessionStore] Session ${sessionId} not found, retrying...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      session = await fetchSession();
    }

    if (!session) {
      console.log(
        `[UserSessionStore] Session ${sessionId} still not found, final retry...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      session = await fetchSession();
    }

    return session;
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
