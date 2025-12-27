import { AuthenticatedHandler } from "./core/types";
import {
  UploadRepository,
  SourceAccountRepository,
  MatchRepository,
} from "./repositories";
import { successResponse } from "./utils";
import { normalize } from "./utils/string.utils";
import { withAuthErrorHandling } from "./core/middleware";
import { ValidationError } from "./core/errors";

interface SearchResult {
  sourceUser: {
    username: string;
    date: string;
  };
  atprotoMatches: Array<{
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    description?: string;
    matchScore: number;
    postCount: number;
    followerCount: number;
  }>;
  isSearching?: boolean;
  error?: string;
  selectedMatches?: any;
}

interface SaveResultsRequest {
  uploadId: string;
  sourcePlatform: string;
  results: SearchResult[];
  saveData?: boolean;
}

const saveResultsHandler: AuthenticatedHandler = async (context) => {
  const body: SaveResultsRequest = JSON.parse(context.event.body || "{}");
  const { uploadId, sourcePlatform, results, saveData } = body;

  if (!uploadId || !sourcePlatform || !Array.isArray(results)) {
    throw new ValidationError(
      "uploadId, sourcePlatform, and results are required",
    );
  }

  if (saveData === false) {
    console.log(
      `User ${context.did} has data storage disabled - skipping save`,
    );
    return successResponse({
      success: true,
      message: "Data storage disabled - results not saved",
      uploadId,
      totalUsers: results.length,
      matchedUsers: results.filter((r) => r.atprotoMatches.length > 0).length,
      unmatchedUsers: results.filter((r) => r.atprotoMatches.length === 0)
        .length,
    });
  }

  const uploadRepo = new UploadRepository();
  const sourceAccountRepo = new SourceAccountRepository();
  const matchRepo = new MatchRepository();
  let matchedCount = 0;

  // Check if this specific upload already exists
  const existingUpload = await uploadRepo.getUpload(uploadId, context.did);

  if (!existingUpload) {
    // Upload doesn't exist - create it (file upload flow)
    await uploadRepo.createUpload(
      uploadId,
      context.did,
      sourcePlatform,
      results.length,
      0,
    );
  } else {
    // Upload exists (extension flow) - just update it with matches
    console.log(`[save-results] Updating existing upload ${uploadId} with matches`);
  }

  const allUsernames = results.map((r) => r.sourceUser.username);
  const sourceAccountIdMap = await sourceAccountRepo.bulkCreate(
    sourcePlatform,
    allUsernames,
  );

  const links = results
    .map((result) => {
      const normalized = normalize(result.sourceUser.username);
      const sourceAccountId = sourceAccountIdMap.get(normalized);
      return {
        sourceAccountId: sourceAccountId!,
        sourceDate: result.sourceUser.date,
      };
    })
    .filter((link) => link.sourceAccountId !== undefined);

  await sourceAccountRepo.linkUserToAccounts(uploadId, context.did, links);

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

  for (const result of results) {
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

  let matchIdMap = new Map<string, number>();
  if (allMatches.length > 0) {
    matchIdMap = await matchRepo.bulkStoreMatches(allMatches);
  }

  if (matchedSourceAccountIds.length > 0) {
    await sourceAccountRepo.markAsMatched(matchedSourceAccountIds);
  }

  const statuses: Array<{
    did: string;
    atprotoMatchId: number;
    sourceAccountId: number;
    viewed: boolean;
  }> = [];

  for (const match of allMatches) {
    const key = `${match.sourceAccountId}:${match.atprotoDid}`;
    const matchId = matchIdMap.get(key);
    if (matchId) {
      statuses.push({
        did: context.did,
        atprotoMatchId: matchId,
        sourceAccountId: match.sourceAccountId,
        viewed: true,
      });
    }
  }

  if (statuses.length > 0) {
    await matchRepo.upsertUserMatchStatus(statuses);
  }

  await uploadRepo.updateMatchCounts(
    uploadId,
    matchedCount,
    results.length - matchedCount,
  );

  return successResponse({
    success: true,
    uploadId,
    totalUsers: results.length,
    matchedUsers: matchedCount,
    unmatchedUsers: results.length - matchedCount,
  });
};

export const handler = withAuthErrorHandling(saveResultsHandler);
