import { BaseRepository } from "./BaseRepository";
import { UserUploadRow } from "../core/types";

export class UploadRepository extends BaseRepository {
  /**
   * Create a new upload record
   **/
  async createUpload(
    uploadId: string,
    did: string,
    sourcePlatform: string,
    totalUsers: number,
    matchedUsers: number,
  ): Promise<void> {
    await this.sql`
      INSERT INTO user_uploads (upload_id, did, source_platform, total_users, matched_users, unmatched_users)
      VALUES (${uploadId}, ${did}, ${sourcePlatform}, ${totalUsers}, ${matchedUsers}, ${totalUsers - matchedUsers})
      ON CONFLICT (upload_id) DO NOTHING
    `;
  }

  /**
   * Get all uploads for a user
   **/
  async getUserUploads(did: string): Promise<UserUploadRow[]> {
    const result = await this.sql`
      SELECT
        upload_id,
        source_platform,
        created_at,
        total_users,
        matched_users,
        unmatched_users
      FROM user_uploads
      WHERE did = ${did}
      ORDER BY created_at DESC
    `;
    return result as UserUploadRow[];
  }

  /**
   * Get a specific upload
   **/
  async getUpload(
    uploadId: string,
    did: string,
  ): Promise<UserUploadRow | null> {
    const result = await this.sql`
      SELECT * FROM user_uploads
      WHERE upload_id = ${uploadId} AND did = ${did}
    `;
    const rows = result as UserUploadRow[];
    return rows[0] || null;
  }

  /**
   * Update upload match counts
   **/
  async updateMatchCounts(
    uploadId: string,
    matchedUsers: number,
    unmatchedUsers: number,
  ): Promise<void> {
    await this.sql`
      UPDATE user_uploads
      SET matched_users = ${matchedUsers},
          unmatched_users = ${unmatchedUsers}
      WHERE upload_id = ${uploadId}
    `;
  }

  /**
   * Check for recent uploads (within 5 seconds)
   **/
  async hasRecentUpload(did: string): Promise<boolean> {
    const result = await this.sql`
      SELECT upload_id FROM user_uploads
      WHERE did = ${did}
      AND created_at > NOW() - INTERVAL '5 seconds'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return (result as any[]).length > 0;
  }
}
