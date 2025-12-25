import { SimpleHandler } from "./core/types/api.types";
import { SessionService } from "./services/SessionService";
import { extractSessionId } from "./core/middleware";
import { successResponse } from "./utils";
import { withErrorHandling } from "./core/middleware";
import { AuthenticationError, ERROR_MESSAGES } from "./core/errors";
import { profileCache } from "./infrastructure/cache/CacheService";

const sessionHandler: SimpleHandler = async (event) => {
  const sessionId =
    event.queryStringParameters?.session || extractSessionId(event);

  if (!sessionId) {
    throw new AuthenticationError(ERROR_MESSAGES.NO_SESSION_COOKIE);
  }

  const isValid = await SessionService.verifySession(sessionId);
  if (!isValid) {
    throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
  }

  const did = await SessionService.getDIDForSession(sessionId);
  if (!did) {
    throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
  }

  const cached = profileCache.get<any>(did);
  if (cached) {
    console.log("Returning cached profile for", did);
    return successResponse(cached, 200, {
      "Cache-Control": "private, max-age=300",
      "X-Cache-Status": "HIT",
    });
  }

  const { agent } = await SessionService.getAgentForSession(sessionId, event);

  const profile = await agent.getProfile({ actor: did });

  const profileData = {
    did: did,
    handle: profile.data.handle,
    displayName: profile.data.displayName,
    avatar: profile.data.avatar,
    description: profile.data.description,
  };

  profileCache.set(did, profileData);

  return successResponse(profileData, 200, {
    "Cache-Control": "private, max-age=300",
    "X-Cache-Status": "MISS",
  });
};

export const handler = withErrorHandling(sessionHandler);
