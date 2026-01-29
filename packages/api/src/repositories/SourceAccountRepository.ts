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
      date_on_source: link.sourceDate ? new Date(link.sourceDate) : null,
    }));

    await this.db
      .insertInto('user_source_follows')
      .values(values)
      .onConflict((oc) =>
        oc.columns(['upload_id', 'source_account_id']).doNothing(),
      )
      .execute();
  }
}
