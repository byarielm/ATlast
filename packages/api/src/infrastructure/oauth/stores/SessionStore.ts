import { db } from "../../../db/client";
import type { SimpleStore, GetOptions } from "@atproto-labs/simple-store";
import type { NodeSavedSession } from "@atproto/oauth-client-node";
import {
  encryptToken,
  decryptToken,
  isEncryptionConfigured,
} from "../../../utils/encryption.utils";

interface EncryptedSessionData {
  encrypted: true;
  dpopJwk: unknown;
  tokenSet: string; // Encrypted tokenSet
}

/**
 * PostgreSQL-backed session store for OAuth sessions
 * Encrypts token sets at rest for security
 * Implements SimpleStore<string, NodeSavedSession> for compatibility with @atproto/oauth-client-node
 */
export class PostgresSessionStore implements SimpleStore<string, NodeSavedSession> {
  private encryptionEnabled = isEncryptionConfigured();

  async get(key: string, _options?: GetOptions): Promise<NodeSavedSession | undefined> {
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
        const decryptedTokenSet = decryptToken<NodeSavedSession["tokenSet"]>(
          encryptedData.tokenSet,
        );

        return {
          dpopJwk: encryptedData.dpopJwk,
          tokenSet: decryptedTokenSet,
        } as NodeSavedSession;
      } catch (error) {
        console.error(
          "[SessionStore] Failed to decrypt session token set:",
          error,
        );
        return undefined;
      }
    }

    // Fallback for unencrypted format
    return stored as NodeSavedSession;
  }

  async set(key: string, value: NodeSavedSession): Promise<void> {
    let dataToStore: Record<string, unknown>;

    if (this.encryptionEnabled) {
      // Encrypt only tokenSet, keep dpopJwk as-is
      dataToStore = {
        encrypted: true,
        dpopJwk: value.dpopJwk,
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
