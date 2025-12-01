import { BaseRepository } from "./BaseRepository";
import { normalize } from "../utils/string.utils";

export class SourceAccountRepository extends BaseRepository {
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

  async bulkCreate(
    sourcePlatform: string,
    usernames: string[],
  ): Promise<Map<string, number>> {
    // Prepare data
    const rows = usernames.map((username) => [
      sourcePlatform,
      username,
      normalize(username),
    ]);

    // Use helper to build UNNEST arrays
    const [platforms, sourceUsernames, normalized] = this.buildUnnestArrays(
      ["source_platform", "source_username", "normalized_username"],
      rows,
    );

    // Execute with Neon's template syntax
    const result = await this.sql`
      INSERT INTO source_accounts (source_platform, source_username, normalized_username)
      SELECT * FROM UNNEST(
        ${platforms}::text[],
        ${sourceUsernames}::text[],
        ${normalized}::text[]
      ) AS t(source_platform, source_username, normalized_username)
      ON CONFLICT (source_platform, normalized_username) DO UPDATE
        SET source_username = EXCLUDED.source_username
      RETURNING id, normalized_username
    `;

    // Use helper to build result map
    return this.buildIdMap(result as any[], "normalized_username", "id");
  }

  async markAsMatched(sourceAccountIds: number[]): Promise<void> {
    if (sourceAccountIds.length === 0) return;

    await this.sql`
      UPDATE source_accounts
      SET match_found = true, match_found_at = NOW()
      WHERE id = ANY(${sourceAccountIds})
    `;
  }

  async linkUserToAccounts(
    uploadId: string,
    did: string,
    links: Array<{ sourceAccountId: number; sourceDate: string }>,
  ): Promise<void> {
    if (links.length === 0) return;

    const rows = links.map((l) => [
      uploadId,
      did,
      l.sourceAccountId,
      l.sourceDate,
    ]);

    const [uploadIds, dids, sourceAccountIds, sourceDates] =
      this.buildUnnestArrays(
        ["upload_id", "did", "source_account_id", "source_date"],
        rows,
      );

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
