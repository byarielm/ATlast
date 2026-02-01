import { db } from "../../../db/client";
import type { SimpleStore, GetOptions } from "@atproto-labs/simple-store";
import type { NodeSavedState } from "@atproto/oauth-client-node";

/**
 * PostgreSQL-backed state store for OAuth flow
 * Stores ephemeral state data with automatic expiry (1 hour via cleanup job)
 * Implements SimpleStore<string, NodeSavedState> for compatibility with @atproto/oauth-client-node
 */
export class PostgresStateStore implements SimpleStore<string, NodeSavedState> {
  async get(key: string, _options?: GetOptions): Promise<NodeSavedState | undefined> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await db
      .selectFrom("oauth_states")
      .select("data")
      .where("state", "=", key)
      .where("created_at", ">", oneHourAgo)
      .executeTakeFirst();

    if (!result) return undefined;

    // State data contains dpopJwk which must remain as JWK object
    return result.data as unknown as NodeSavedState;
  }

  async set(key: string, value: NodeSavedState): Promise<void> {
    try {
      console.log("[StateStore] Storing state:", key);
      await db
        .insertInto("oauth_states")
        .values({
          state: key,
          data: value as unknown as Record<string, unknown>,
        })
        .onConflict((oc) =>
          oc.column("state").doUpdateSet({
            data: value as unknown as Record<string, unknown>,
          }),
        )
        .execute();
      console.log("[StateStore] State stored successfully");
    } catch (error) {
      console.error("[StateStore] Failed to store state:", error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    await db.deleteFrom("oauth_states").where("state", "=", key).execute();
  }
}

export const stateStore = new PostgresStateStore();
