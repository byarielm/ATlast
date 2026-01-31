/**
 * Match Repository
 * Manages AT Protocol matches for source accounts
 */

import { BaseRepository } from './BaseRepository';
import { sql } from 'kysely';

export class MatchRepository extends BaseRepository {
  /**
   * Store a single match (actor found on Bluesky)
   */
  async storeMatch(
    sourceAccountId: number,
    atprotoDid: string,
    atprotoHandle: string,
    atprotoDisplayName: string | undefined,
    atprotoAvatar: string | undefined,
    matchScore: number,
    postCount?: number,
    followerCount?: number,
    followStatus?: Record<string, boolean>,
  ): Promise<number> {
    const result = await this.db
      .insertInto('atproto_matches')
      .values({
        source_account_id: sourceAccountId,
        atproto_did: atprotoDid,
        atproto_handle: atprotoHandle,
        display_name: atprotoDisplayName || null,
        match_score: matchScore,
        post_count: postCount || 0,
        follower_count: followerCount || 0,
        follow_status: followStatus || {},
      })
      .onConflict((oc) =>
        oc.columns(['source_account_id', 'atproto_did']).doUpdateSet({
          atproto_handle: atprotoHandle,
          display_name: atprotoDisplayName || null,
          match_score: matchScore,
          post_count: postCount || 0,
          follower_count: followerCount || 0,
          follow_status: sql`COALESCE(atproto_matches.follow_status, '{}'::jsonb) || ${JSON.stringify(followStatus || {})}::jsonb`,
        }),
      )
      .returning('id')
      .executeTakeFirst();

    return result!.id;
  }

  /**
   * Bulk store matches
   * Returns a map of "sourceAccountId:atprotoDid" -> matchId
   */
  async bulkStoreMatches(
    matches: Array<{
      sourceAccountId: number;
      atprotoDid: string;
      atprotoHandle: string;
      atprotoDisplayName?: string;
      atprotoAvatar?: string;
      matchScore: number;
      postCount?: number;
      followerCount?: number;
      followStatus?: Record<string, boolean>;
    }>,
  ): Promise<Map<string, number>> {
    if (matches.length === 0) return new Map();

    const values = matches.map((m) => ({
      source_account_id: m.sourceAccountId,
      atproto_did: m.atprotoDid,
      atproto_handle: m.atprotoHandle,
      display_name: m.atprotoDisplayName || null,
      match_score: m.matchScore,
      post_count: m.postCount || 0,
      follower_count: m.followerCount || 0,
      follow_status: m.followStatus || {},
    }));

    const results = await this.db
      .insertInto('atproto_matches')
      .values(values)
      .onConflict((oc) =>
        oc.columns(['source_account_id', 'atproto_did']).doUpdateSet({
          atproto_handle: (eb) => eb.ref('excluded.atproto_handle'),
          display_name: (eb) => eb.ref('excluded.display_name'),
          match_score: (eb) => eb.ref('excluded.match_score'),
          post_count: (eb) => eb.ref('excluded.post_count'),
          follower_count: (eb) => eb.ref('excluded.follower_count'),
          follow_status: sql`COALESCE(atproto_matches.follow_status, '{}'::jsonb) || excluded.follow_status`,
        }),
      )
      .returning(['id', 'source_account_id', 'atproto_did'])
      .execute();

    const idMap = new Map<string, number>();
    for (const row of results) {
      idMap.set(`${row.source_account_id}:${row.atproto_did}`, row.id);
    }

    return idMap;
  }

  /**
   * Update follow status for a match
   */
  async updateFollowStatus(
    atprotoDid: string,
    followLexicon: string,
    isFollowing: boolean,
  ): Promise<void> {
    await this.db
      .updateTable('atproto_matches')
      .set({
        follow_status: sql`follow_status || jsonb_build_object(${followLexicon}, ${isFollowing})`,
      })
      .where('atproto_did', '=', atprotoDid)
      .execute();
  }

  /**
   * Get upload details with matches
   * Used by results endpoints
   */
  async getUploadDetails(
    uploadId: string,
    userDid: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{
    results: any[];
    totalUsers: number;
  }> {
    // First, verify upload belongs to user
    const upload = await this.db
      .selectFrom('user_uploads')
      .select(['upload_id', 'total_users'])
      .where('upload_id', '=', uploadId)
      .where('user_did', '=', userDid)
      .executeTakeFirst();

    if (!upload) {
      return { results: [], totalUsers: 0 };
    }

    const offset = (page - 1) * pageSize;

    // Get source accounts with their matches
    const results = await this.db
      .selectFrom('user_source_follows as usf')
      .innerJoin('source_accounts as sa', 'usf.source_account_id', 'sa.id')
      .innerJoin('user_uploads as uu', 'usf.upload_id', 'uu.upload_id')
      .leftJoin('atproto_matches as am', (join) =>
        join
          .onRef('sa.id', '=', 'am.source_account_id')
      )
      .leftJoin('user_match_status as ums', (join) =>
        join
          .onRef('am.id', '=', 'ums.match_id')
          .on('ums.user_did', '=', userDid)
      )
      .select([
        'sa.original_username',
        'sa.normalized_username',
        'sa.date_on_source',
        'am.atproto_did',
        'am.atproto_handle',
        'am.display_name',
        'am.match_score',
        'am.post_count',
        'am.follower_count',
        'am.found_at',
        'am.follow_status',
        'ums.dismissed',
        sql<number>`CASE WHEN am.found_at > uu.created_at THEN 1 ELSE 0 END`.as('is_new_match'),
      ])
      .where('usf.upload_id', '=', uploadId)
      .orderBy(sql`CASE WHEN am.atproto_did IS NOT NULL THEN 0 ELSE 1 END`)
      .orderBy('is_new_match', 'desc')
      .orderBy('am.post_count', 'desc')
      .orderBy('am.follower_count', 'desc')
      .orderBy('sa.original_username')
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      results,
      totalUsers: upload.total_users,
    };
  }

  /**
   * Upsert user match status (viewed, dismissed, etc.)
   */
  async upsertUserMatchStatus(
    statuses: Array<{
      userDid: string;
      atprotoMatchId: number;
      sourceAccountId: number;
      viewed: boolean;
    }>,
  ): Promise<void> {
    if (statuses.length === 0) return;

    const values = statuses.map((s) => ({
      user_did: s.userDid,
      match_id: s.atprotoMatchId, // Fixed: match_id not atproto_match_id
      viewed: s.viewed,
    }));

    await this.db
      .insertInto('user_match_status')
      .values(values)
      .onConflict((oc) =>
        oc.columns(['user_did', 'match_id']).doUpdateSet({
          viewed: (eb) => eb.ref('excluded.viewed'),
          updated_at: sql`NOW()`,
        }),
      )
      .execute();
  }
}
