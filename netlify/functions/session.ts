import { SimpleHandler } from "./shared/types/api.types";
import { SessionService } from "./shared/services/session";
import { extractSessionId } from "./shared/middleware";
import { successResponse } from "./shared/utils";
import { withErrorHandling } from "./shared/middleware";
import { AuthenticationError, ERROR_MESSAGES } from "./shared/constants/errors";

// In-memory cache for profile
const profileCache = new Map<string, { data: any; timestamp: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const sessionHandler: SimpleHandler = async (event) => {
  const sessionId =
    event.queryStringParameters?.session || extractSessionId(event);

  if (!sessionId) {
    throw new AuthenticationError(ERROR_MESSAGES.NO_SESSION_COOKIE);
  }

  // Verify session exists
  const isValid = await SessionService.verifySession(sessionId);
  if (!isValid) {
    throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
  }

  // Get DID from session
  const did = await SessionService.getDIDForSession(sessionId);
  if (!did) {
    throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
  }

  const now = Date.now();

  // Check profile cache
  const cached = profileCache.get(did);
  if (cached && now - cached.timestamp < PROFILE_CACHE_TTL) {
    console.log("Returning cached profile for", did);
    return successResponse(cached.data, 200, {
      "Cache-Control": "private, max-age=300",
      "X-Cache-Status": "HIT",
    });
  }

  // Cache miss - fetch full profile
  const { agent } = await SessionService.getAgentForSession(sessionId);

  // Get profile - throw error if this fails
  const profile = await agent.getProfile({ actor: did });

  const profileData = {
    did: did,
    handle: profile.data.handle,
    displayName: profile.data.displayName,
    avatar: profile.data.avatar,
    description: profile.data.description,
  };

  // Cache the profile data
  profileCache.set(did, {
    data: profileData,
    timestamp: now,
  });

  // Clean up old profile cache entries
  if (profileCache.size > 100) {
    for (const [cachedDid, entry] of profileCache.entries()) {
      if (now - entry.timestamp > PROFILE_CACHE_TTL) {
        profileCache.delete(cachedDid);
      }
    }
  }

  return successResponse(profileData, 200, {
    "Cache-Control": "private, max-age=300",
    "X-Cache-Status": "MISS",
  });
};

export const handler = withErrorHandling(sessionHandler);
