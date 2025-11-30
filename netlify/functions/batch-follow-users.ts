import { AuthenticatedHandler } from "./shared/types";
import { SessionService } from "./shared/services/session";
import { MatchRepository } from "./shared/repositories";
import { successResponse } from "./shared/utils";
import { withAuthErrorHandling } from "./shared/middleware";
import { ValidationError } from "./shared/constants/errors";

const batchFollowHandler: AuthenticatedHandler = async (context) => {
  // Parse request body
  const body = JSON.parse(context.event.body || "{}");
  const dids: string[] = body.dids || [];
  const followLexicon: string = body.followLexicon || "app.bsky.graph.follow";

  if (!Array.isArray(dids) || dids.length === 0) {
    throw new ValidationError("dids array is required and must not be empty");
  }

  // Limit batch size to prevent timeouts and respect rate limits
  if (dids.length > 100) {
    throw new ValidationError("Maximum 100 DIDs per batch");
  }

  // Get authenticated agent using SessionService
  const { agent } = await SessionService.getAgentForSession(context.sessionId);

  // Check existing follows before attempting to follow
  const alreadyFollowing = new Set<string>();
  try {
    let cursor: string | undefined = undefined;
    let hasMore = true;
    const didsSet = new Set(dids);

    while (hasMore && didsSet.size > 0) {
      const response = await agent.api.com.atproto.repo.listRecords({
        repo: context.did,
        collection: followLexicon,
        limit: 100,
        cursor,
      });

      for (const record of response.data.records) {
        const followRecord = record.value as any;
        if (followRecord?.subject && didsSet.has(followRecord.subject)) {
          alreadyFollowing.add(followRecord.subject);
          didsSet.delete(followRecord.subject);
        }
      }

      cursor = response.data.cursor;
      hasMore = !!cursor;

      if (didsSet.size === 0) {
        break;
      }
    }
  } catch (error) {
    console.error("Error checking existing follows:", error);
    // Continue - we'll handle duplicates in the follow loop
  }

  // Follow all users
  const results = [];
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;
  const matchRepo = new MatchRepository();

  for (const did of dids) {
    // Skip if already following
    if (alreadyFollowing.has(did)) {
      results.push({
        did,
        success: true,
        alreadyFollowing: true,
        error: null,
      });

      // Update database follow status
      try {
        await matchRepo.updateFollowStatus(did, followLexicon, true);
      } catch (dbError) {
        console.error("Failed to update follow status in DB:", dbError);
      }

      continue;
    }

    try {
      await agent.api.com.atproto.repo.createRecord({
        repo: context.did,
        collection: followLexicon,
        record: {
          $type: followLexicon,
          subject: did,
          createdAt: new Date().toISOString(),
        },
      });

      results.push({
        did,
        success: true,
        alreadyFollowing: false,
        error: null,
      });

      // Update database follow status
      try {
        await matchRepo.updateFollowStatus(did, followLexicon, true);
      } catch (dbError) {
        console.error("Failed to update follow status in DB:", dbError);
      }

      // Reset error counter on success
      consecutiveErrors = 0;
    } catch (error) {
      consecutiveErrors++;

      results.push({
        did,
        success: false,
        alreadyFollowing: false,
        error: error instanceof Error ? error.message : "Follow failed",
      });

      // If we hit rate limits, implement exponential backoff
      if (
        error instanceof Error &&
        (error.message.includes("rate limit") || error.message.includes("429"))
      ) {
        const backoffDelay = Math.min(
          200 * Math.pow(2, consecutiveErrors),
          2000,
        );
        console.log(`Rate limit hit. Backing off for ${backoffDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      } else if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        // For other repeated errors, small backoff
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const alreadyFollowingCount = results.filter(
    (r) => r.alreadyFollowing,
  ).length;

  return successResponse({
    success: true,
    total: dids.length,
    succeeded: successCount,
    failed: failCount,
    alreadyFollowing: alreadyFollowingCount,
    results,
  });
};

export const handler = withAuthErrorHandling(batchFollowHandler);
