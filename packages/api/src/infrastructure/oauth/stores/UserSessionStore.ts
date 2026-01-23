import { db } from "../../../db/client";
import { UserSessionData } from "../types";

const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * PostgreSQL-backed user session store
 * Maps session IDs to user DIDs for authenticated requests
 */
export class PostgresUserSessionStore {
  async get(sessionId: string): Promise<UserSessionData | undefined> {
    const fetchSession = async () => {
      const now = new Date();

      const result = await db
        .selectFrom("user_sessions")
        .select("did")
        .where("session_id", "=", sessionId)
        .where("expires_at", ">", now)
        .executeTakeFirst();

      return result ? { did: result.did } : undefined;
    };

    // Try once, if not found retry twice with small delays
    // This handles eventual consistency in database replication
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
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY);

    await db
      .insertInto("user_sessions")
      .values({
        session_id: sessionId,
        did: data.did,
        fingerprint: JSON.stringify(data.fingerprint || {}),
        expires_at: expiresAt,
      })
      .onConflict((oc) =>
        oc.column("session_id").doUpdateSet({
          did: data.did,
          fingerprint: JSON.stringify(data.fingerprint || {}),
          expires_at: expiresAt,
        }),
      )
      .execute();
  }

  async del(sessionId: string): Promise<void> {
    await db
      .deleteFrom("user_sessions")
      .where("session_id", "=", sessionId)
      .execute();
  }
}

export const userSessionStore = new PostgresUserSessionStore();
