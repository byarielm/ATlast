import { AuthenticatedHandler } from "./core/types";
import { SessionService } from "./services/SessionService";
import { FollowService } from "./services/FollowService";
import { MatchRepository } from "./repositories";
import { successResponse } from "./utils";
import { withAuthErrorHandling } from "./core/middleware";
import { ValidationError } from "./core/errors";

const batchFollowHandler: AuthenticatedHandler = async (context) => {
  const body = JSON.parse(context.event.body || "{}");
  const dids: string[] = body.dids || [];
  const followLexicon: string = body.followLexicon || "app.bsky.graph.follow";

  if (!Array.isArray(dids) || dids.length === 0) {
    throw new ValidationError("dids array is required and must not be empty");
  }

  if (dids.length > 100) {
    throw new ValidationError("Maximum 100 DIDs per batch");
  }

  const { agent } = await SessionService.getAgentForSession(
    context.sessionId,
    context.event,
  );

  const alreadyFollowing = await FollowService.getAlreadyFollowing(
    agent,
    context.did,
    dids,
    followLexicon,
  );

  const results = [];
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;
  const matchRepo = new MatchRepository();

  for (const did of dids) {
    if (alreadyFollowing.has(did)) {
      results.push({
        did,
        success: true,
        alreadyFollowing: true,
        error: null,
      });

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

      try {
        await matchRepo.updateFollowStatus(did, followLexicon, true);
      } catch (dbError) {
        console.error("Failed to update follow status in DB:", dbError);
      }

      consecutiveErrors = 0;
    } catch (error) {
      consecutiveErrors++;

      results.push({
        did,
        success: false,
        alreadyFollowing: false,
        error: error instanceof Error ? error.message : "Follow failed",
      });

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
