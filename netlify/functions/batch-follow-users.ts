import { AuthenticatedHandler } from "./core/types";
import { SessionService } from "./services/SessionService";
import { FollowService } from "./services/FollowService";
import { MatchRepository } from "./repositories";
import { successResponse, validateArrayInput, ValidationSchemas } from "./utils";
import { withAuthErrorHandling } from "./core/middleware";

const batchFollowHandler: AuthenticatedHandler = async (context) => {
  const body = JSON.parse(context.event.body || "{}");
  const dids = validateArrayInput<string>(
    context.event.body,
    "dids",
    ValidationSchemas.didsArray,
  );
  const followLexicon: string = body.followLexicon || "app.bsky.graph.follow";

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

  const matchRepo = new MatchRepository();
  const CONCURRENCY = 5; // Process 5 follows in parallel

  // Helper function to follow a single user
  const followUser = async (did: string) => {
    if (alreadyFollowing.has(did)) {
      try {
        await matchRepo.updateFollowStatus(did, followLexicon, true);
      } catch (dbError) {
        console.error("Failed to update follow status in DB:", dbError);
      }

      return {
        did,
        success: true,
        alreadyFollowing: true,
        error: null,
      };
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

      try {
        await matchRepo.updateFollowStatus(did, followLexicon, true);
      } catch (dbError) {
        console.error("Failed to update follow status in DB:", dbError);
      }

      return {
        did,
        success: true,
        alreadyFollowing: false,
        error: null,
      };
    } catch (error) {
      // Rate limit handling with backoff
      if (
        error instanceof Error &&
        (error.message.includes("rate limit") || error.message.includes("429"))
      ) {
        const backoffDelay = 1000; // 1 second backoff for rate limits
        console.log(`Rate limit hit for ${did}. Backing off for ${backoffDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }

      return {
        did,
        success: false,
        alreadyFollowing: false,
        error: error instanceof Error ? error.message : "Follow failed",
      };
    }
  };

  // Process follows in chunks with controlled concurrency
  const results = [];
  for (let i = 0; i < dids.length; i += CONCURRENCY) {
    const chunk = dids.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.allSettled(
      chunk.map(did => followUser(did))
    );

    // Extract results from Promise.allSettled
    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // This shouldn't happen as we handle errors in followUser
        console.error('Unexpected promise rejection:', result.reason);
        results.push({
          did: 'unknown',
          success: false,
          alreadyFollowing: false,
          error: 'Unexpected error',
        });
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
