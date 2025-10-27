import { getDbClient } from './db';

// Normalize username for consistent matching
export function normalizeUsername(username: string): string {
  return username.toLowerCase().replace(/[._-]/g, '');
}

// Get or create a source account, returns the source_account_id
export async function getOrCreateSourceAccount(
  platform: string,
  username: string
): Promise<number> {
  const sql = getDbClient();
  const normalized = normalizeUsername(username);
  
  const result = await sql`
    INSERT INTO source_accounts (source_platform, source_username, normalized_username)
    VALUES (${platform}, ${username}, ${normalized})
    ON CONFLICT (source_platform, normalized_username) 
    DO UPDATE SET source_username = ${username}
    RETURNING id
  `;
  
  return (result as Array<{ id: number }>)[0].id;
}

// Link a user to a source account
export async function linkUserToSourceAccount(
  uploadId: string,
  did: string,
  sourceAccountId: number,
  sourceDate?: string
): Promise<void> {
  const sql = getDbClient();
  
  await sql`
    INSERT INTO user_source_follows (upload_id, did, source_account_id, source_date)
    VALUES (${uploadId}, ${did}, ${sourceAccountId}, ${sourceDate || null})
    ON CONFLICT (upload_id, source_account_id) DO NOTHING
  `;
}

// Store ATProto match for account (handles duplicates), returns atproto_match_id
export async function storeAtprotoMatch(
  sourceAccountId: number,
  atprotoDid: string,
  atprotoHandle: string,
  displayName: string | undefined,
  avatar: string | undefined,
  matchScore: number
): Promise<number> {
  const sql = getDbClient();
  
  const result = await sql`
    INSERT INTO atproto_matches (
      source_account_id, 
      atproto_did, 
      atproto_handle, 
      atproto_display_name, 
      atproto_avatar, 
      match_score,
      last_verified
    )
    VALUES (
      ${sourceAccountId}, 
      ${atprotoDid}, 
      ${atprotoHandle}, 
      ${displayName || null}, 
      ${avatar || null}, 
      ${matchScore},
      NOW()
    )
    ON CONFLICT (source_account_id, atproto_did) 
    DO UPDATE SET 
      atproto_handle = ${atprotoHandle},
      atproto_display_name = ${displayName || null},
      atproto_avatar = ${avatar || null},
      match_score = ${matchScore},
      last_verified = NOW()
    RETURNING id
  `;
  
  return (result as Array<{ id: number }>)[0].id;
}

// Mark source account as having matches
export async function markSourceAccountMatched(sourceAccountId: number): Promise<void> {
  const sql = getDbClient();
  
  await sql`
    UPDATE source_accounts 
    SET match_found = TRUE, match_found_at = NOW()
    WHERE id = ${sourceAccountId}
  `;
}

// Create user match status (tracks if user has viewed/followed this match)
export async function createUserMatchStatus(
  did: string,
  atprotoMatchId: number,
  sourceAccountId: number,
  viewed: boolean = true
): Promise<void> {
  const sql = getDbClient();
  
  await sql`
    INSERT INTO user_match_status (did, atproto_match_id, source_account_id, viewed, viewed_at)
    VALUES (
      ${did}, 
      ${atprotoMatchId}, 
      ${sourceAccountId}, 
      ${viewed},
      ${viewed ? 'NOW()' : null}
    )
    ON CONFLICT (did, atproto_match_id) DO NOTHING
  `;
}

// Create upload record
export async function createUpload(
  uploadId: string,
  did: string,
  platform: string,
  totalUsers: number,
  matchedUsers: number
): Promise<void> {
  const sql = getDbClient();
  
  await sql`
    INSERT INTO user_uploads (upload_id, did, source_platform, total_users, matched_users, unmatched_users)
    VALUES (
      ${uploadId}, 
      ${did}, 
      ${platform}, 
      ${totalUsers}, 
      ${matchedUsers},
      ${totalUsers - matchedUsers}
    )
  `;
}

// Get user's uploads
export async function getUserUploads(did: string, platform?: string) {
  const sql = getDbClient();
  
  if (platform) {
    return await sql`
      SELECT * FROM user_uploads 
      WHERE did = ${did} AND source_platform = ${platform}
      ORDER BY created_at DESC
    `;
  }
  
  return await sql`
    SELECT * FROM user_uploads 
    WHERE did = ${did}
    ORDER BY created_at DESC
  `;
}