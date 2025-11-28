import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { SessionManager } from "./session-manager";
import cookie from "cookie";

// In-memory cache for profile
const profileCache = new Map<string, { data: any; timestamp: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
  try {
    const cookies = event.headers.cookie
      ? cookie.parse(event.headers.cookie)
      : {};
    const sessionId =
      event.queryStringParameters?.session || cookies.atlast_session;

    if (!sessionId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No session" }),
      };
    }

    // Verify session exists
    const isValid = await SessionManager.verifySession(sessionId);
    if (!isValid) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid or expired session" }),
      };
    }

    // Get DID from session
    const did = await SessionManager.getDIDForSession(sessionId);
    if (!did) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid session" }),
      };
    }

    const now = Date.now();

    // Check profile cache
    const cached = profileCache.get(did);
    if (cached && now - cached.timestamp < PROFILE_CACHE_TTL) {
      console.log("Returning cached profile for", did);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "private, max-age=300", // Browser can cache for 5 minutes
          "X-Cache-Status": "HIT",
        },
        body: JSON.stringify(cached.data),
      };
    }

    // Cache miss - fetch full profile
    try {
      // Get authenticated agent using SessionManager
      const { agent } = await SessionManager.getAgentForSession(sessionId);

      // Get profile
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

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "private, max-age=300",
          "X-Cache-Status": "MISS",
        },
        body: JSON.stringify(profileData),
      };
    } catch (error) {
      console.error("Profile fetch error:", error);

      // If profile fetch fails, return basic session info
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-Cache-Status": "ERROR",
        },
        body: JSON.stringify({
          did: did,
          // Profile data unavailable
        }),
      };
    }
  } catch (error) {
    console.error("Session error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
