/**
 * Results Routes
 * Endpoints for saving and retrieving search results
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { UploadRepository } from '../repositories/UploadRepository';
import { SourceAccountRepository } from '../repositories/SourceAccountRepository';
import { MatchRepository } from '../repositories/MatchRepository';
import { normalize } from '../utils/string.utils';
import { ValidationError, NotFoundError } from '../errors';
import { z } from 'zod';

const results = new Hono();

// Zod schemas for validation
const searchResultSchema = z.object({
  sourceUser: z.object({
    username: z.string(),
    date: z.string().optional().default(''),
  }),
  atprotoMatches: z.array(
    z.object({
      did: z.string(),
      handle: z.string(),
      displayName: z.string().optional(),
      avatar: z.string().optional(),
      description: z.string().optional(),
      matchScore: z.number(),
      postCount: z.number(),
      followerCount: z.number(),
    }),
  ),
  isSearching: z.boolean().optional(),
  error: z.string().optional(),
  selectedMatches: z.any().optional(),
});

const saveResultsSchema = z.object({
  uploadId: z.string(),
  sourcePlatform: z.string(),
  results: z.array(searchResultSchema),
  saveData: z.boolean().optional().default(true),
});

const uploadDetailsParamsSchema = z.object({
  uploadId: z.string(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});

/**
 * POST /api/results/save
 * Save search results for a user
 */
results.post('/save', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { uploadId, sourcePlatform, results: searchResults, saveData } = saveResultsSchema.parse(body);

  const userDid = c.get('did');

  // If user has disabled data storage, skip save
  if (saveData === false) {
    console.log(`[save-results] User ${userDid} has data storage disabled - skipping save`);

    const matchedCount = searchResults.filter((r) => r.atprotoMatches.length > 0).length;

    return c.json({
      success: true,
      message: 'Data storage disabled - results not saved',
      uploadId,
      totalUsers: searchResults.length,
      matchedUsers: matchedCount,
      unmatchedUsers: searchResults.length - matchedCount,
    });
  }

  const uploadRepo = new UploadRepository();
  const sourceAccountRepo = new SourceAccountRepository();
  const matchRepo = new MatchRepository();
  let matchedCount = 0;

  // Check if this specific upload already exists
  const existingUpload = await uploadRepo.getUpload(uploadId, userDid);

  if (!existingUpload) {
    // Upload doesn't exist - create it (file upload flow)
    await uploadRepo.createUpload(
      uploadId,
      userDid,
      sourcePlatform,
      searchResults.length,
      0,
    );
  } else {
    // Upload exists (extension flow) - just update it with matches
    console.log(`[save-results] Updating existing upload ${uploadId} with matches`);
  }

  // Bulk create source accounts
  const allUsernames = searchResults.map((r) => r.sourceUser.username);
  const sourceAccountIdMap = await sourceAccountRepo.bulkCreate(
    sourcePlatform,
    allUsernames,
  );

  // Link source accounts to upload
  const links = searchResults
    .map((result) => {
      const normalized = normalize(result.sourceUser.username);
      const sourceAccountId = sourceAccountIdMap.get(normalized);
      return {
        sourceAccountId: sourceAccountId!,
        sourceDate: result.sourceUser.date,
      };
    })
    .filter((link) => link.sourceAccountId !== undefined);

  await sourceAccountRepo.linkUserToAccounts(uploadId, userDid, links);

  // Prepare matches for bulk insert
  const allMatches: Array<{
    sourceAccountId: number;
    atprotoDid: string;
    atprotoHandle: string;
    atprotoDisplayName?: string;
    atprotoAvatar?: string;
    atprotoDescription?: string;
    matchScore: number;
    postCount: number;
    followerCount: number;
  }> = [];

  const matchedSourceAccountIds: number[] = [];

  for (const result of searchResults) {
    const normalized = normalize(result.sourceUser.username);
    const sourceAccountId = sourceAccountIdMap.get(normalized);

    if (
      sourceAccountId &&
      result.atprotoMatches &&
      result.atprotoMatches.length > 0
    ) {
      matchedCount++;
      matchedSourceAccountIds.push(sourceAccountId);

      for (const match of result.atprotoMatches) {
        allMatches.push({
          sourceAccountId,
          atprotoDid: match.did,
          atprotoHandle: match.handle,
          atprotoDisplayName: match.displayName,
          atprotoAvatar: match.avatar,
          atprotoDescription: (match as any).description,
          matchScore: match.matchScore,
          postCount: match.postCount || 0,
          followerCount: match.followerCount || 0,
        });
      }
    }
  }

  // Bulk store matches
  let matchIdMap = new Map<string, number>();
  if (allMatches.length > 0) {
    matchIdMap = await matchRepo.bulkStoreMatches(allMatches);
  }

  // Mark source accounts as matched
  if (matchedSourceAccountIds.length > 0) {
    await sourceAccountRepo.markAsMatched(matchedSourceAccountIds);
  }

  // Create user match status records
  const statuses: Array<{
    userDid: string;
    atprotoMatchId: number;
    sourceAccountId: number;
    viewed: boolean;
  }> = [];

  for (const match of allMatches) {
    const key = `${match.sourceAccountId}:${match.atprotoDid}`;
    const matchId = matchIdMap.get(key);
    if (matchId) {
      statuses.push({
        userDid,
        atprotoMatchId: matchId,
        sourceAccountId: match.sourceAccountId,
        viewed: true,
      });
    }
  }

  if (statuses.length > 0) {
    await matchRepo.upsertUserMatchStatus(statuses);
  }

  // Update upload match counts
  await uploadRepo.updateMatchCounts(
    uploadId,
    matchedCount,
    searchResults.length - matchedCount,
  );

  return c.json({
    success: true,
    uploadId,
    totalUsers: searchResults.length,
    matchedUsers: matchedCount,
    unmatchedUsers: searchResults.length - matchedCount,
  });
});

/**
 * GET /api/results/uploads
 * Get all uploads for the authenticated user
 */
results.get('/uploads', authMiddleware, async (c) => {
  const userDid = c.get('did');
  const uploadRepo = new UploadRepository();

  const uploads = await uploadRepo.getUserUploads(userDid);

  return c.json({
    success: true,
    data: {
      uploads: uploads.map((upload) => ({
        uploadId: upload.upload_id,
        sourcePlatform: upload.source_platform,
        createdAt: upload.created_at,
        totalUsers: upload.total_users,
        matchedUsers: upload.matched_users,
        unmatchedUsers: upload.unmatched_users,
      })),
    },
  });
});

/**
 * GET /api/results/upload-details
 * Get detailed results for a specific upload with pagination
 */
results.get('/upload-details', authMiddleware, async (c) => {
  const userDid = c.get('did');
  const query = c.req.query();

  const { uploadId, page, pageSize } = uploadDetailsParamsSchema.parse(query);

  const matchRepo = new MatchRepository();

  // Fetch paginated results
  const { results: rawResults, totalUsers } = await matchRepo.getUploadDetails(
    uploadId,
    userDid,
    page,
    pageSize,
  );

  if (totalUsers === 0) {
    throw new NotFoundError('Upload not found');
  }

  const totalPages = Math.ceil(totalUsers / pageSize);

  // Group results by source username
  const groupedResults = new Map<string, any>();

  rawResults.forEach((row: any) => {
    const username = row.original_username;

    // Get or create the entry for this username
    let userResult = groupedResults.get(username);

    if (!userResult) {
      userResult = {
        sourceUser: {
          username: username,
          date: row.date_on_source || '',
        },
        atprotoMatches: [],
      };
      groupedResults.set(username, userResult);
    }

    // Add the match (if it exists) to the array
    if (row.atproto_did) {
      userResult.atprotoMatches.push({
        did: row.atproto_did,
        handle: row.atproto_handle,
        displayName: row.display_name,
        matchScore: row.match_score,
        postCount: row.post_count,
        followerCount: row.follower_count,
        foundAt: row.found_at,
        dismissed: row.dismissed || false,
        followStatus: row.follow_status || {},
      });
    }
  });

  const searchResults = Array.from(groupedResults.values());

  return c.json(
    {
      success: true,
      data: {
        results: searchResults,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    },
    200,
    {
      'Cache-Control': 'private, max-age=600',
    },
  );
});

export default results;
