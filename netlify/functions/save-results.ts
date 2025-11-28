import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { userSessions } from "./oauth-stores-db";
import cookie from "cookie";
import {
  createUpload,
  bulkCreateSourceAccounts,
  bulkLinkUserToSourceAccounts,
  bulkStoreAtprotoMatches,
  bulkMarkSourceAccountsMatched,
  bulkCreateUserMatchStatus,
} from "./db-helpers";
import { getDbClient } from "./db";

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

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Get session from cookie
    const cookies = event.headers.cookie
      ? cookie.parse(event.headers.cookie)
      : {};
    const sessionId = cookies.atlast_session;

    if (!sessionId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No session cookie" }),
      };
    }

    // Get DID from session
    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid or expired session" }),
      };
    }

    // Parse request body
    const body: SaveResultsRequest = JSON.parse(event.body || "{}");
    const { uploadId, sourcePlatform, results, saveData } = body;

    if (!uploadId || !sourcePlatform || !Array.isArray(results)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "uploadId, sourcePlatform, and results are required",
        }),
      };
    }

    // Server-side validation for saveData flag, controlled by frontend
    if (saveData === false) {
      console.log(
        `User ${userSession.did} has data storage disabled - skipping save`,
      );
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          message: "Data storage disabled - results not saved",
          uploadId,
          totalUsers: results.length,
          matchedUsers: results.filter((r) => r.atprotoMatches.length > 0)
            .length,
          unmatchedUsers: results.filter((r) => r.atprotoMatches.length === 0)
            .length,
        }),
      };
    }

    const sql = getDbClient();
    let matchedCount = 0;

    // Check for recent uploads from this user
    const recentUpload = await sql`
      SELECT upload_id FROM user_uploads
      WHERE did = ${userSession.did}
      AND created_at > NOW() - INTERVAL '5 seconds'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if ((recentUpload as any[]).length > 0) {
      console.log(
        `User ${userSession.did} already saved within 5 seconds, skipping duplicate`,
      );
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, message: "Recently saved" }),
      };
    }

    // Create upload record FIRST
    await createUpload(
      uploadId,
      userSession.did,
      sourcePlatform,
      results.length,
      0,
    );

    // BULK OPERATION 1: Create all source accounts at once
    const allUsernames = results.map((r) => r.sourceUser.username);
    const sourceAccountIdMap = await bulkCreateSourceAccounts(
      sourcePlatform,
      allUsernames,
    );

    // BULK OPERATION 2: Link all users to source accounts
    const links = results
      .map((result) => {
        const normalized = result.sourceUser.username
          .toLowerCase()
          .replace(/[._-]/g, "");
        const sourceAccountId = sourceAccountIdMap.get(normalized);
        return {
          sourceAccountId: sourceAccountId!,
          sourceDate: result.sourceUser.date,
        };
      })
      .filter((link) => link.sourceAccountId !== undefined);

    await bulkLinkUserToSourceAccounts(uploadId, userSession.did, links);

    // BULK OPERATION 3: Store all atproto matches at once
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
      const normalized = result.sourceUser.username
        .toLowerCase()
        .replace(/[._-]/g, "");
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

    // Store all matches in one operation
    let matchIdMap = new Map<string, number>();
    if (allMatches.length > 0) {
      matchIdMap = await bulkStoreAtprotoMatches(allMatches);
    }

    // BULK OPERATION 4: Mark all matched source accounts
    if (matchedSourceAccountIds.length > 0) {
      await bulkMarkSourceAccountsMatched(matchedSourceAccountIds);
    }

    // BULK OPERATION 5: Create all user match statuses
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
          did: userSession.did,
          atprotoMatchId: matchId,
          sourceAccountId: match.sourceAccountId,
          viewed: true,
        });
      }
    }

    if (statuses.length > 0) {
      await bulkCreateUserMatchStatus(statuses);
    }

    // Update upload record with final counts
    await sql`
      UPDATE user_uploads
      SET matched_users = ${matchedCount},
          unmatched_users = ${results.length - matchedCount}
      WHERE upload_id = ${uploadId}
    `;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        uploadId,
        totalUsers: results.length,
        matchedUsers: matchedCount,
        unmatchedUsers: results.length - matchedCount,
      }),
    };
  } catch (error) {
    console.error("Save results error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to save results",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
