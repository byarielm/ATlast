import { getDbClient } from "./db";

export async function createUpload(
  uploadId: string,
  did: string,
  sourcePlatform: string,
  totalUsers: number,
  matchedUsers: number,
) {
  const sql = getDbClient();
  await sql`
    INSERT INTO user_uploads (upload_id, did, source_platform, total_users, matched_users, unmatched_users)
    VALUES (${uploadId}, ${did}, ${sourcePlatform}, ${totalUsers}, ${matchedUsers}, ${totalUsers - matchedUsers})
    ON CONFLICT (upload_id) DO NOTHING
  `;
}

export async function getOrCreateSourceAccount(
  sourcePlatform: string,
  sourceUsername: string,
): Promise<number> {
  const sql = getDbClient();
  const normalized = sourceUsername.toLowerCase().replace(/[._-]/g, "");

  const result = await sql`
    INSERT INTO source_accounts (source_platform, source_username, normalized_username)
    VALUES (${sourcePlatform}, ${sourceUsername}, ${normalized})
    ON CONFLICT (source_platform, normalized_username) DO UPDATE SET
      source_username = ${sourceUsername}
    RETURNING id
  `;

  return (result as any[])[0].id;
}

export async function linkUserToSourceAccount(
  uploadId: string,
  did: string,
  sourceAccountId: number,
  sourceDate: string,
) {
  const sql = getDbClient();
  await sql`
    INSERT INTO user_source_follows (upload_id, did, source_account_id, source_date)
    VALUES (${uploadId}, ${did}, ${sourceAccountId}, ${sourceDate})
    ON CONFLICT (upload_id, source_account_id) DO NOTHING
  `;
}

export async function storeAtprotoMatch(
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
  const sql = getDbClient();
  const result = await sql`
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

export async function markSourceAccountMatched(sourceAccountId: number) {
  const sql = getDbClient();
  await sql`
    UPDATE source_accounts
    SET match_found = true, match_found_at = NOW()
    WHERE id = ${sourceAccountId}
  `;
}

export async function createUserMatchStatus(
  did: string,
  atprotoMatchId: number,
  sourceAccountId: number,
  viewed: boolean = false,
) {
  const sql = getDbClient();
  await sql`
    INSERT INTO user_match_status (did, atproto_match_id, source_account_id, viewed, viewed_at)
    VALUES (${did}, ${atprotoMatchId}, ${sourceAccountId}, ${viewed}, ${viewed ? "NOW()" : null})
    ON CONFLICT (did, atproto_match_id) DO UPDATE SET
      viewed = ${viewed},
      viewed_at = CASE WHEN ${viewed} THEN NOW() ELSE user_match_status.viewed_at END
  `;
}

// NEW: Bulk operations for Phase 2
export async function bulkCreateSourceAccounts(
  sourcePlatform: string,
  usernames: string[],
): Promise<Map<string, number>> {
  const sql = getDbClient();

  // Prepare bulk insert values
  const values = usernames.map((username) => ({
    platform: sourcePlatform,
    username: username,
    normalized: username.toLowerCase().replace(/[._-]/g, ""),
  }));

  // Build bulk insert query with unnest
  const platforms = values.map((v) => v.platform);
  const source_usernames = values.map((v) => v.username);
  const normalized = values.map((v) => v.normalized);

  const result = await sql`
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

export async function bulkLinkUserToSourceAccounts(
  uploadId: string,
  did: string,
  links: Array<{ sourceAccountId: number; sourceDate: string }>,
) {
  const sql = getDbClient();

  const numLinks = links.length;
  if (numLinks === 0) return;

  // Extract arrays for columns that change
  const sourceAccountIds = links.map((l) => l.sourceAccountId);
  const sourceDates = links.map((l) => l.sourceDate);

  // Create arrays for the static columns
  const uploadIds = Array(numLinks).fill(uploadId);
  const dids = Array(numLinks).fill(did);

  // Use the parallel UNNEST pattern, which is proven to work in other functions
  await sql`
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
// ====================================================================

export async function bulkStoreAtprotoMatches(
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
  const sql = getDbClient();

  if (matches.length === 0) return new Map();

  const sourceAccountId = matches.map((m) => m.sourceAccountId);
  const atprotoDid = matches.map((m) => m.atprotoDid);
  const atprotoHandle = matches.map((m) => m.atprotoHandle);
  const atprotoDisplayName = matches.map((m) => m.atprotoDisplayName || null);
  const atprotoAvatar = matches.map((m) => m.atprotoAvatar || null);
  const atprotoDescription = matches.map((m) => m.atprotoDescription || null);
  const matchScore = matches.map((m) => m.matchScore);
  const postCount = matches.map((m) => m.postCount || 0);
  const followerCount = matches.map((m) => m.followerCount || 0);
  const followStatus = matches.map((m) => JSON.stringify(m.followStatus || {}));

  const result = await sql`
    INSERT INTO atproto_matches (
      source_account_id, atproto_did, atproto_handle,
      atproto_display_name, atproto_avatar, atproto_description,
      match_score, post_count, follower_count, follow_status
    )
    SELECT * FROM UNNEST(
      ${sourceAccountId}::integer[],
      ${atprotoDid}::text[],
      ${atprotoHandle}::text[],
      ${atprotoDisplayName}::text[],
      ${atprotoAvatar}::text[],
      ${atprotoDescription}::text[],
      ${matchScore}::integer[],
      ${postCount}::integer[],
      ${followerCount}::integer[],
      ${followStatus}::jsonb[]
    ) AS t(
      source_account_id, atproto_did, atproto_handle,
      atproto_display_name, atproto_avatar, match_score,
      post_count, follower_count, follow_status
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

  // Create map of "sourceAccountId:atprotoDid" to match ID
  const idMap = new Map<string, number>();
  for (const row of result as any[]) {
    idMap.set(`${row.source_account_id}:${row.atproto_did}`, row.id);
  }

  return idMap;
}

export async function bulkMarkSourceAccountsMatched(
  sourceAccountIds: number[],
) {
  const sql = getDbClient();

  if (sourceAccountIds.length === 0) return;

  await sql`
    UPDATE source_accounts
    SET match_found = true, match_found_at = NOW()
    WHERE id = ANY(${sourceAccountIds})
  `;
}

export async function bulkCreateUserMatchStatus(
  statuses: Array<{
    did: string;
    atprotoMatchId: number;
    sourceAccountId: number;
    viewed: boolean;
  }>,
) {
  const sql = getDbClient();

  if (statuses.length === 0) return;

  const did = statuses.map((s) => s.did);
  const atprotoMatchId = statuses.map((s) => s.atprotoMatchId);
  const sourceAccountId = statuses.map((s) => s.sourceAccountId);
  const viewedFlags = statuses.map((s) => s.viewed);
  const viewedDates = statuses.map((s) => (s.viewed ? new Date() : null));

  await sql`
    INSERT INTO user_match_status (did, atproto_match_id, source_account_id, viewed, viewed_at)
    SELECT * FROM UNNEST(
      ${did}::text[],
      ${atprotoMatchId}::integer[],
      ${sourceAccountId}::integer[],
      ${viewedFlags}::boolean[],
      ${viewedDates}::timestamp[]
    ) AS t(did, atproto_match_id, source_account_id, viewed, viewed_at)
    ON CONFLICT (did, atproto_match_id) DO UPDATE SET
      viewed = EXCLUDED.viewed,
      viewed_at = CASE WHEN EXCLUDED.viewed THEN NOW() ELSE user_match_status.viewed_at END
  `;
}
