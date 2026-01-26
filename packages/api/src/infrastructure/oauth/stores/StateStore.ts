import { db } from "../../../db/client";
import { StateData } from "../types";

/**
 * PostgreSQL-backed state store for OAuth flow
 * Stores ephemeral state data with automatic expiry (1 hour via cleanup job)
 */
export class PostgresStateStore {
  async get(key: string): Promise<StateData | undefined> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await db
      .selectFrom("oauth_states")
      .select("data")
      .where("state", "=", key)
      .where("created_at", ">", oneHourAgo)
      .executeTakeFirst();

    if (!result) return undefined;

    // State data contains dpopKey which must remain as JWK object
    return result.data as unknown as StateData;
  }

  async set(key: string, value: StateData): Promise<void> {
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
