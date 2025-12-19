import { getDbClient } from "../../database";
import { SessionData, OAuthSessionRow } from "../../../core/types";
import { CONFIG } from "../../../core/config/constants";
import {
  encryptToken,
  decryptToken,
  isEncryptionConfigured,
} from "../../../utils/encryption.utils";

export class PostgresSessionStore {
  private sql = getDbClient();
  private encryptionEnabled = isEncryptionConfigured();

  async get(key: string): Promise<SessionData | undefined> {
    const result = await this.sql`
      SELECT data FROM oauth_sessions
      WHERE key = ${key} AND expires_at > NOW()
    `;
    const rows = result as OAuthSessionRow[];

    if (!rows[0]) return undefined;

    const stored = rows[0].data;

    // Handle encrypted format
    if (
      this.encryptionEnabled &&
      typeof stored === "object" &&
      stored.encrypted
    ) {
      try {
        // Decrypt tokenSet and reconstruct with dpopJwk
        const decryptedTokenSet = decryptToken(stored.tokenSet);

        return {
          dpopJwk: stored.dpopJwk, // Use dpopJwk (not dpopKey!)
          tokenSet: decryptedTokenSet,
          authMethod: stored.authMethod,
        } as SessionData;
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
    const expiresAt = new Date(Date.now() + CONFIG.SESSION_EXPIRY);

    let dataToStore: any;

    if (this.encryptionEnabled) {
      // Encrypt only tokenSet, keep dpopJwk and authMethod as-is
      dataToStore = {
        encrypted: true,
        dpopJwk: (value as any).dpopJwk,
        authMethod: (value as any).authMethod,
        tokenSet: encryptToken(value.tokenSet),
      };
    } else {
      // Store as-is if encryption disabled
      dataToStore = value;
    }

    await this.sql`
      INSERT INTO oauth_sessions (key, data, expires_at)
      VALUES (${key}, ${JSON.stringify(dataToStore)}, ${expiresAt})
      ON CONFLICT (key) DO UPDATE SET
        data = ${JSON.stringify(dataToStore)},
        expires_at = ${expiresAt}
    `;
  }

  async del(key: string): Promise<void> {
    await this.sql`DELETE FROM oauth_sessions WHERE key = ${key}`;
  }
}
