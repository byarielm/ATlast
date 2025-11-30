import { BaseRepository } from "./BaseRepository";
import { normalize } from "../utils";

export class SourceAccountRepository extends BaseRepository {
  /**
   * Get or create a source account
   **/
  async getOrCreate(
    sourcePlatform: string,
    sourceUsername: string,
  ): Promise<number> {
    const normalized = normalize(sourceUsername);

    const result = await this.sql`
      INSERT INTO source_accounts (source_platform, source_username, normalized_username)
      VALUES (${sourcePlatform}, ${sourceUsername}, ${normalized})
      ON CONFLICT (source_platform, normalized_username) DO UPDATE SET
        source_username = ${sourceUsername}
      RETURNING id
    `;

    return (result as any[])[0].id;
  }

  /**
   * Bulk create source accounts
   **/
  async bulkCreate(
    sourcePlatform: string,
    usernames: string[],
  ): Promise<Map<string, number>> {
    const values = usernames.map((username) => ({
      platform: sourcePlatform,
      username: username,
      normalized: normalize(username),
    }));

    const platforms = values.map((v) => v.platform);
    const source_usernames = values.map((v) => v.username);
    const normalized = values.map((v) => v.normalized);

    const result = await this.sql`
      INSERT INTO source_accounts (source_platform, source_username, normalized_username)
      SELECT *
      FROM UNNEST(
        ${platforms}::text[],
        ${source_usernames}::text[],
        ${normalized}::text[]
      ) AS t(source_platform, source_username, normalized_username)
      ON CONFLICT (source_platform, normalized_username) DO UPDATE
        SET source_username = EXCLUDED.source_username
      RETURNING id, normalized_username
    `;

    // Create map of normalized username to ID
    const idMap = new Map<string, number>();
    for (const row of result as any[]) {
      idMap.set(row.normalized_username, row.id);
    }

    return idMap;
  }

  /**
   * Mark source accounts as matched
   **/
  async markAsMatched(sourceAccountIds: number[]): Promise<void> {
    if (sourceAccountIds.length === 0) return;

    await this.sql`
      UPDATE source_accounts
      SET match_found = true, match_found_at = NOW()
      WHERE id = ANY(${sourceAccountIds})
    `;
  }

  /**
   * Link user to source accounts
   **/
  async linkUserToAccounts(
    uploadId: string,
    did: string,
    links: Array<{ sourceAccountId: number; sourceDate: string }>,
  ): Promise<void> {
    const numLinks = links.length;
    if (numLinks === 0) return;

    const sourceAccountIds = links.map((l) => l.sourceAccountId);
    const sourceDates = links.map((l) => l.sourceDate);
    const uploadIds = Array(numLinks).fill(uploadId);
    const dids = Array(numLinks).fill(did);

    await this.sql`
      INSERT INTO user_source_follows (upload_id, did, source_account_id, source_date)
      SELECT * FROM UNNEST(
        ${uploadIds}::text[],
        ${dids}::text[],
        ${sourceAccountIds}::integer[],
        ${sourceDates}::text[]
      ) AS t(upload_id, did, source_account_id, source_date)
      ON CONFLICT (upload_id, source_account_id) DO NOTHING
    `;
  }
}
