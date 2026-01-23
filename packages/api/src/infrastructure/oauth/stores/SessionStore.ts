import { db } from "../../../db/client";
import { SessionData } from "../types";
import {
  encryptToken,
  decryptToken,
  isEncryptionConfigured,
} from "../../../utils/encryption.utils";

interface EncryptedSessionData {
  encrypted: true;
  dpopJwk: unknown;
  authMethod: string;
  tokenSet: string; // Encrypted tokenSet
}

/**
 * PostgreSQL-backed session store for OAuth sessions
 * Encrypts token sets at rest for security
 */
export class PostgresSessionStore {
  private encryptionEnabled = isEncryptionConfigured();

  async get(key: string): Promise<SessionData | undefined> {
    const result = await db
      .selectFrom("oauth_sessions")
      .select("session_data")
      .where("did", "=", key)
      .executeTakeFirst();

    if (!result) return undefined;

    const stored = result.session_data as unknown;

    // Handle encrypted format
    if (
      this.encryptionEnabled &&
      typeof stored === "object" &&
      stored !== null &&
      "encrypted" in stored &&
      stored.encrypted === true
    ) {
      try {
        const encryptedData = stored as EncryptedSessionData;
        // Decrypt tokenSet and reconstruct with dpopJwk
        const decryptedTokenSet = decryptToken<SessionData["tokenSet"]>(
          encryptedData.tokenSet,
        );

        return {
          dpopJwk: encryptedData.dpopJwk,
          tokenSet: decryptedTokenSet,
          authMethod: encryptedData.authMethod,
        };
      } catch (error) {
        console.error(
          "[SessionStore] Failed to decrypt session token set:",
          error,
        );
        return undefined;
      }
    }

    // Fallback for unencrypted format
    return stored as SessionData;
  }

  async set(key: string, value: SessionData): Promise<void> {
    let dataToStore: Record<string, unknown>;

    if (this.encryptionEnabled) {
      // Encrypt only tokenSet, keep dpopJwk and authMethod as-is
      dataToStore = {
        encrypted: true,
        dpopJwk: value.dpopJwk,
        authMethod: value.authMethod,
        tokenSet: encryptToken(value.tokenSet),
      };
    } else {
      // Store as-is if encryption disabled
      dataToStore = value as unknown as Record<string, unknown>;
    }

    await db
      .insertInto("oauth_sessions")
      .values({
        did: key,
        session_data: dataToStore,
      })
      .onConflict((oc) =>
        oc.column("did").doUpdateSet({
          session_data: dataToStore,
        }),
      )
      .execute();
  }

  async del(key: string): Promise<void> {
    await db.deleteFrom("oauth_sessions").where("did", "=", key).execute();
  }
}

export const sessionStore = new PostgresSessionStore();
