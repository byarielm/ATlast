import { BaseRepository } from "./BaseRepository";

export class MatchRepository extends BaseRepository {
  async storeMatch(
    sourceAccountId: number,
    atprotoDid: string,
    atprotoHandle: string,
    atprotoDisplayName: string | undefined,
    atprotoAvatar: string | undefined,
    matchScore: number,
    postCount: number,
    followerCount: number,
    followStatus?: Record<string, boolean>,
  ): Promise<number> {
    const result = await this.sql`
      INSERT INTO atproto_matches (
        source_account_id, atproto_did, atproto_handle,
        atproto_display_name, atproto_avatar, match_score,
        post_count, follower_count, follow_status
      )
      VALUES (
        ${sourceAccountId}, ${atprotoDid}, ${atprotoHandle},
        ${atprotoDisplayName || null}, ${atprotoAvatar || null}, ${matchScore},
        ${postCount || 0}, ${followerCount || 0}, ${JSON.stringify(followStatus || {})}
      )
      ON CONFLICT (source_account_id, atproto_did) DO UPDATE SET
        atproto_handle = ${atprotoHandle},
        atproto_display_name = ${atprotoDisplayName || null},
        atproto_avatar = ${atprotoAvatar || null},
        match_score = ${matchScore},
        post_count = ${postCount},
        follower_count = ${followerCount},
        follow_status = COALESCE(atproto_matches.follow_status, '{}'::jsonb) || ${JSON.stringify(followStatus || {})},
        last_verified = NOW()
      RETURNING id
    `;

    return (result as any[])[0].id;
  }

  async bulkStoreMatches(
    matches: Array<{
      sourceAccountId: number;
      atprotoDid: string;
      atprotoHandle: string;
      atprotoDisplayName?: string;
      atprotoAvatar?: string;
      atprotoDescription?: string;
      matchScore: number;
      postCount?: number;
      followerCount?: number;
      followStatus?: Record<string, boolean>;
    }>,
  ): Promise<Map<string, number>> {
    if (matches.length === 0) return new Map();

    const rows = matches.map((m) => [
      m.sourceAccountId,
      m.atprotoDid,
      m.atprotoHandle,
      m.atprotoDisplayName || null,
      m.atprotoAvatar || null,
      m.atprotoDescription || null,
      m.matchScore,
      m.postCount || 0,
      m.followerCount || 0,
      JSON.stringify(m.followStatus || {}),
    ]);

    const [
      sourceAccountIds,
      atprotoDids,
      atprotoHandles,
      atprotoDisplayNames,
      atprotoAvatars,
      atprotoDescriptions,
      matchScores,
      postCounts,
      followerCounts,
      followStatuses,
    ] = this.buildUnnestArrays(
      [
        "source_account_id",
        "atproto_did",
        "atproto_handle",
        "atproto_display_name",
        "atproto_avatar",
        "atproto_description",
        "match_score",
        "post_count",
        "follower_count",
        "follow_status",
      ],
      rows,
    );

    const result = await this.sql`
      INSERT INTO atproto_matches (
        source_account_id, atproto_did, atproto_handle,
        atproto_display_name, atproto_avatar, atproto_description,
        match_score, post_count, follower_count, follow_status
      )
      SELECT * FROM UNNEST(
        ${sourceAccountIds}::integer[],
        ${atprotoDids}::text[],
        ${atprotoHandles}::text[],
        ${atprotoDisplayNames}::text[],
        ${atprotoAvatars}::text[],
        ${atprotoDescriptions}::text[],
        ${matchScores}::integer[],
        ${postCounts}::integer[],
        ${followerCounts}::integer[],
        ${followStatuses}::jsonb[]
      ) AS t(
        source_account_id, atproto_did, atproto_handle,
        atproto_display_name, atproto_avatar, atproto_description,
        match_score, post_count, follower_count, follow_status
      )
      ON CONFLICT (source_account_id, atproto_did) DO UPDATE SET
        atproto_handle = EXCLUDED.atproto_handle,
        atproto_display_name = EXCLUDED.atproto_display_name,
        atproto_avatar = EXCLUDED.atproto_avatar,
        atproto_description = EXCLUDED.atproto_description,
        match_score = EXCLUDED.match_score,
        post_count = EXCLUDED.post_count,
        follower_count = EXCLUDED.follower_count,
        follow_status = COALESCE(atproto_matches.follow_status, '{}'::jsonb) || EXCLUDED.follow_status,
        last_verified = NOW()
      RETURNING id, source_account_id, atproto_did
    `;

    const idMap = new Map<string, number>();
    for (const row of result as any[]) {
      idMap.set(`${row.source_account_id}:${row.atproto_did}`, row.id);
    }

    return idMap;
  }

  async getUploadDetails(
    uploadId: string,
    did: string,
    page: number,
    pageSize: number,
  ): Promise<{
    results: any[];
    totalUsers: number;
  }> {
    const uploadCheck = await this.sql`
      SELECT upload_id, total_users FROM user_uploads
      WHERE upload_id = ${uploadId} AND did = ${did}
    `;

    if ((uploadCheck as any[]).length === 0) {
      return { results: [], totalUsers: 0 };
    }

    const totalUsers = (uploadCheck as any[])[0].total_users;
    const offset = (page - 1) * pageSize;

    const results = await this.sql`
      SELECT
        sa.source_username,
        sa.normalized_username,
        usf.source_date,
        am.atproto_did,
        am.atproto_handle,
        am.atproto_display_name,
        am.atproto_avatar,
        am.atproto_description,
        am.match_score,
        am.post_count,
        am.follower_count,
        am.found_at,
        am.follow_status,
        am.last_follow_check,
        ums.dismissed,
        CASE WHEN am.found_at > uu.created_at THEN 1 ELSE 0 END as is_new_match
      FROM user_source_follows usf
      JOIN source_accounts sa ON usf.source_account_id = sa.id
      JOIN user_uploads uu ON usf.upload_id = uu.upload_id
      LEFT JOIN atproto_matches am ON sa.id = am.source_account_id AND am.is_active = true
      LEFT JOIN user_match_status ums ON am.id = ums.atproto_match_id AND ums.did = ${did}
      WHERE usf.upload_id = ${uploadId}
      ORDER BY
        CASE WHEN am.atproto_did IS NOT NULL THEN 0 ELSE 1 END,
        is_new_match DESC,
        am.post_count DESC NULLS LAST,
        am.follower_count DESC NULLS LAST,
        sa.source_username
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    return {
      results: results as any[],
      totalUsers,
    };
  }

  async updateFollowStatus(
    atprotoDid: string,
    followLexicon: string,
    isFollowing: boolean,
  ): Promise<void> {
    await this.sql`
      UPDATE atproto_matches
      SET follow_status = follow_status || jsonb_build_object(${followLexicon}, ${isFollowing}),
          last_follow_check = NOW()
      WHERE atproto_did = ${atprotoDid}
    `;
  }

  async upsertUserMatchStatus(
    statuses: Array<{
      did: string;
      atprotoMatchId: number;
      sourceAccountId: number;
      viewed: boolean;
    }>,
  ): Promise<void> {
    if (statuses.length === 0) return;

    const rows = statuses.map((s) => [
      s.did,
      s.atprotoMatchId,
      s.sourceAccountId,
      s.viewed,
      s.viewed ? new Date().toISOString() : null,
    ]);

    const [dids, atprotoMatchIds, sourceAccountIds, viewedFlags, viewedDates] =
      this.buildUnnestArrays(
        ["did", "atproto_match_id", "source_account_id", "viewed", "viewed_at"],
        rows,
      );

    await this.sql`
      INSERT INTO user_match_status (did, atproto_match_id, source_account_id, viewed, viewed_at)
      SELECT * FROM UNNEST(
        ${dids}::text[],
        ${atprotoMatchIds}::integer[],
        ${sourceAccountIds}::integer[],
        ${viewedFlags}::boolean[],
        ${viewedDates}::timestamp[]
      ) AS t(did, atproto_match_id, source_account_id, viewed, viewed_at)
      ON CONFLICT (did, atproto_match_id) DO UPDATE SET
        viewed = EXCLUDED.viewed,
        viewed_at = CASE WHEN EXCLUDED.viewed THEN NOW() ELSE user_match_status.viewed_at END
    `;
  }
}
