import { AuthenticatedHandler } from "./core/types";
import { SessionService } from "./services/SessionService";
import { FollowService } from "./services/FollowService";
import { successResponse, validateArrayInput, ValidationSchemas } from "./utils";
import { withAuthErrorHandling } from "./core/middleware";

const checkFollowStatusHandler: AuthenticatedHandler = async (context) => {
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

  const followStatus = await FollowService.checkFollowStatus(
    agent,
    context.did,
    dids,
    followLexicon,
  );

  return successResponse({ followStatus });
};

export const handler = withAuthErrorHandling(checkFollowStatusHandler);
