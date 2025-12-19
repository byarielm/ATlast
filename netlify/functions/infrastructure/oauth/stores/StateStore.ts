import { getDbClient } from "../../database";
import { StateData, OAuthStateRow } from "../../../core/types";
import { CONFIG } from "../../../core/config/constants";

export class PostgresStateStore {
  private sql = getDbClient();

  async get(key: string): Promise<StateData | undefined> {
    const result = await this.sql`
      SELECT data FROM oauth_states
      WHERE key = ${key} AND expires_at > NOW()
    `;
    const rows = result as OAuthStateRow[];

    if (!rows[0]) return undefined;

    // State data contains dpopKey which must remain as JWK object
    // We don't encrypt state data - it's ephemeral (10 min expiry)
    return rows[0].data as StateData;
  }

  async set(key: string, value: StateData): Promise<void> {
    const expiresAt = new Date(Date.now() + CONFIG.STATE_EXPIRY);

    // Store as-is - no encryption for state data
    // State is ephemeral and dpopKey needs to be valid JWK
    const dataToStore = JSON.stringify(value);

    await this.sql`
      INSERT INTO oauth_states (key, data, expires_at)
      VALUES (${key}, ${dataToStore}, ${expiresAt.toISOString()})
      ON CONFLICT (key) DO UPDATE SET
        data = ${dataToStore},
        expires_at = ${expiresAt.toISOString()}
    `;
  }

  async del(key: string): Promise<void> {
    await this.sql`DELETE FROM oauth_states WHERE key = ${key}`;
  }
}
