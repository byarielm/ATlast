/**
 * Source Account Repository
 * Manages source platform accounts (Instagram, TikTok, Twitter)
 */

import { BaseRepository } from './BaseRepository';
import { normalize } from '../utils/string.utils';
import { sql } from 'kysely';

export class SourceAccountRepository extends BaseRepository {
  /**
   * Get or create a source account
   * Uses normalized username for deduplication
   */
  async getOrCreate(
    sourcePlatform: string,
    sourceUsername: string,
  ): Promise<number> {
    const normalized = normalize(sourceUsername);

    const result = await this.db
      .insertInto('source_accounts')
      .values({
        source_platform: sourcePlatform,
        original_username: sourceUsername,
        normalized_username: normalized,
      })
      .onConflict((oc) =>
        oc
          .columns(['source_platform', 'normalized_username'])
          .doUpdateSet({
            original_username: sourceUsername,
          }),
      )
      .returning('id')
      .executeTakeFirst();

    return result!.id;
  }

  /**
   * Bulk create source accounts
   * Returns a map of normalized_username -> id
   */
  async bulkCreate(
    sourcePlatform: string,
    usernames: string[],
  ): Promise<Map<string, number>> {
    if (usernames.length === 0) return new Map();

    // Prepare values for bulk insert
    const values = usernames.map((username) => ({
      source_platform: sourcePlatform,
      original_username: username,
      normalized_username: normalize(username),
    }));

    const results = await this.db
      .insertInto('source_accounts')
      .values(values)
      .onConflict((oc) =>
        oc
          .columns(['source_platform', 'normalized_username'])
          .doUpdateSet({
            original_username: (eb) => eb.ref('excluded.original_username'),
          }),
      )
      .returning(['id', 'normalized_username'])
      .execute();

    return this.buildIdMap(results, 'normalized_username', 'id');
  }

  /**
   * Link user to source accounts (for upload tracking)
   */
  async linkUserToAccounts(
    uploadId: string,
    userDid: string,
    links: Array<{ sourceAccountId: number; sourceDate?: string }>,
  ): Promise<void> {
    if (links.length === 0) return;

    const values = links.map((link) => ({
      upload_id: uploadId,
      user_did: userDid,
      source_account_id: link.sourceAccountId,
      // Note: date_on_source is stored in source_accounts table, not user_source_follows
    }));

    await this.db
      .insertInto('user_source_follows')
      .values(values)
      .onConflict((oc) =>
        oc.columns(['upload_id', 'source_account_id']).doNothing(),
      )
      .execute();
  }

  /**
   * Mark source accounts as matched
   * NOTE: This is a no-op in the new schema. The old schema had match_found
   * and match_found_at columns, but the new schema tracks matches via the
   * atproto_matches table instead. Keeping this method for compatibility.
   */
  async markAsMatched(sourceAccountIds: number[]): Promise<void> {
    // No-op: match status is tracked via atproto_matches table existence
    if (sourceAccountIds.length === 0) return;

    // In the new schema, a source account is "matched" if it has rows in atproto_matches
    // No need to update source_accounts table
    return;
  }
}
