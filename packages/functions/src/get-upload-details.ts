import { AuthenticatedHandler } from "./core/types";
import { MatchRepository } from "./repositories";
import { successResponse } from "./utils";
import { withAuthErrorHandling } from "./core/middleware";
import { ValidationError, NotFoundError } from "./core/errors";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const getUploadDetailsHandler: AuthenticatedHandler = async (context) => {
  const uploadId = context.event.queryStringParameters?.uploadId;
  const page = parseInt(context.event.queryStringParameters?.page || "1");
  const pageSize = Math.min(
    parseInt(
      context.event.queryStringParameters?.pageSize ||
        String(DEFAULT_PAGE_SIZE),
    ),
    MAX_PAGE_SIZE,
  );

  if (!uploadId) {
    throw new ValidationError("uploadId is required");
  }

  if (page < 1 || pageSize < 1) {
    throw new ValidationError("Invalid page or pageSize parameters");
  }

  const matchRepo = new MatchRepository();

  // Fetch paginated results
  const { results, totalUsers } = await matchRepo.getUploadDetails(
    uploadId,
    context.did,
    page,
    pageSize,
  );

  if (totalUsers === 0) {
    throw new NotFoundError("Upload not found");
  }

  const totalPages = Math.ceil(totalUsers / pageSize);

  // Group results by source username
  const groupedResults = new Map<string, any>();

  results.forEach((row: any) => {
    const username = row.source_username;

    // Get or create the entry for this username
    let userResult = groupedResults.get(username);

    if (!userResult) {
      userResult = {
        sourceUser: {
          username: username,
          date: row.source_date || "",
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
        displayName: row.atproto_display_name,
        avatar: row.atproto_avatar,
        description: row.atproto_description,
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

  return successResponse(
    {
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
    200,
    {
      "Cache-Control": "private, max-age=600",
    },
  );
};

export const handler = withAuthErrorHandling(getUploadDetailsHandler);
