import { getDbClient } from "../../database/connection";
import { StateData, OAuthStateRow } from "../../../types";
import { CONFIG } from "../../../constants";

export class PostgresStateStore {
  private sql = getDbClient();

  async get(key: string): Promise<StateData | undefined> {
    const result = await this.sql`
      SELECT data FROM oauth_states
      WHERE key = ${key} AND expires_at > NOW()
    `;
    const rows = result as OAuthStateRow[];
    return rows[0]?.data as StateData | undefined;
  }

  async set(key: string, value: StateData): Promise<void> {
    const expiresAt = new Date(Date.now() + CONFIG.STATE_EXPIRY);
    await this.sql`
      INSERT INTO oauth_states (key, data, expires_at)
      VALUES (${key}, ${JSON.stringify(value)}, ${expiresAt.toISOString()})
      ON CONFLICT (key) DO UPDATE SET
        data = ${JSON.stringify(value)},
        expires_at = ${expiresAt.toISOString()}
    `;
  }

  async del(key: string): Promise<void> {
    await this.sql`DELETE FROM oauth_states WHERE key = ${key}`;
  }
}
