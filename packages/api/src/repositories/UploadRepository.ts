/**
 * Upload Repository for Kysely
 * Manages user uploads and search results
 */

import { BaseRepository } from './BaseRepository';
import { sql } from 'kysely';

export interface UserUploadRow {
  upload_id: string;
  user_did: string;
  source_platform: string;
  created_at: Date;
  total_users: number;
  matched_users: number;
  unmatched_users: number;
}

export class UploadRepository extends BaseRepository {
  /**
   * Create a new upload record
   */
  async createUpload(
    uploadId: string,
    userDid: string,
    sourcePlatform: string,
    totalUsers: number,
    matchedUsers: number,
  ): Promise<void> {
    await this.db
      .insertInto('user_uploads')
      .values({
        upload_id: uploadId,
        user_did: userDid,
        source_platform: sourcePlatform,
        total_users: totalUsers,
        matched_users: matchedUsers,
        unmatched_users: totalUsers - matchedUsers,
      })
      .onConflict((oc) => oc.column('upload_id').doNothing())
      .execute();
  }

  /**
   * Get all uploads for a user, ordered by most recent first
   */
  async getUserUploads(userDid: string): Promise<UserUploadRow[]> {
    const results = await this.db
      .selectFrom('user_uploads')
      .select([
        'upload_id',
        'user_did',
        'source_platform',
        'created_at',
        'total_users',
        'matched_users',
        'unmatched_users',
      ])
      .where('user_did', '=', userDid)
      .orderBy('created_at', 'desc')
      .execute();

    return results as UserUploadRow[];
  }

  /**
   * Get a specific upload for a user
   */
  async getUpload(uploadId: string, userDid: string): Promise<UserUploadRow | null> {
    const result = await this.db
      .selectFrom('user_uploads')
      .selectAll()
      .where('upload_id', '=', uploadId)
      .where('user_did', '=', userDid)
      .executeTakeFirst();

    return (result as UserUploadRow) || null;
  }

  /**
   * Update upload match counts
   */
  async updateMatchCounts(
    uploadId: string,
    matchedUsers: number,
    unmatchedUsers: number,
  ): Promise<void> {
    await this.db
      .updateTable('user_uploads')
      .set({
        matched_users: matchedUsers,
        unmatched_users: unmatchedUsers,
      })
      .where('upload_id', '=', uploadId)
      .execute();
  }

  /**
   * Check for recent uploads (within 5 seconds)
   * Used to prevent duplicate submissions
   */
  async hasRecentUpload(userDid: string): Promise<boolean> {
    const result = await this.db
      .selectFrom('user_uploads')
      .select('upload_id')
      .where('user_did', '=', userDid)
      .where('created_at', '>', sql<Date>`NOW() - INTERVAL '5 seconds'`)
      .orderBy('created_at', 'desc')
      .limit(1)
      .execute();

    return result.length > 0;
  }
}
