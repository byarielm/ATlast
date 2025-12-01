import { AuthenticatedHandler } from "./core/types";
import { SessionService } from "./services/SessionService";
import { FollowService } from "./services/FollowService";
import { successResponse } from "./utils";
import { withAuthErrorHandling } from "./core/middleware";
import { ValidationError } from "./core/errors";

const checkFollowStatusHandler: AuthenticatedHandler = async (context) => {
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

  const followStatus = await FollowService.checkFollowStatus(
    agent,
    context.did,
    dids,
    followLexicon,
  );

  return successResponse({ followStatus });
};

export const handler = withAuthErrorHandling(checkFollowStatusHandler);
