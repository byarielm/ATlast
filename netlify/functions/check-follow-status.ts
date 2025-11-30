import { AuthenticatedHandler } from "./shared/types";
import { SessionService } from "./shared/services/session";
import { successResponse } from "./shared/utils";
import { withAuthErrorHandling } from "./shared/middleware";
import { ValidationError } from "./shared/constants/errors";

const checkFollowStatusHandler: AuthenticatedHandler = async (context) => {
  // Parse request body
  const body = JSON.parse(context.event.body || "{}");
  const dids: string[] = body.dids || [];
  const followLexicon: string = body.followLexicon || "app.bsky.graph.follow";

  if (!Array.isArray(dids) || dids.length === 0) {
    throw new ValidationError("dids array is required and must not be empty");
  }

  // Limit batch size
  if (dids.length > 100) {
    throw new ValidationError("Maximum 100 DIDs per batch");
  }

  // Get authenticated agent using SessionService
  const { agent } = await SessionService.getAgentForSession(context.sessionId);

  // Build follow status map
  const followStatus: Record<string, boolean> = {};

  // Initialize all as not following
  dids.forEach((did) => {
    followStatus[did] = false;
  });

  // Query user's follow graph for the specific lexicon
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

      // Check each record
      for (const record of response.data.records) {
        const followRecord = record.value as any;
        if (followRecord?.subject && didsSet.has(followRecord.subject)) {
          followStatus[followRecord.subject] = true;
          didsSet.delete(followRecord.subject); // Found it, no need to keep checking
        }
      }

      cursor = response.data.cursor;
      hasMore = !!cursor;

      // If we've found all DIDs, break early
      if (didsSet.size === 0) {
        break;
      }
    }
  } catch (error) {
    console.error("Error querying follow graph:", error);
    // On error, return all as false (not following) - fail safe
  }

  return successResponse({ followStatus });
};

export const handler = withAuthErrorHandling(checkFollowStatusHandler);
