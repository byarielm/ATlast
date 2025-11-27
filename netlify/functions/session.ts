import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import {
  NodeOAuthClient,
  atprotoLoopbackClientMetadata,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { stateStore, sessionStore, userSessions } from "./oauth-stores-db";
import { getOAuthConfig } from "./oauth-config";
import { Agent } from "@atproto/api";
import cookie from "cookie";

function normalizePrivateKey(key: string): string {
  if (!key.includes("\n") && key.includes("\\n")) {
    return key.replace(/\\n/g, "\n");
  }
  return key;
}

// ENHANCED: Two-tier cache system
// Tier 1: In-memory cache for profile data (lives for function instance)
const profileCache = new Map<string, { data: any; timestamp: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Tier 2: Session metadata cache (DID -> basic info, faster than full OAuth restore)
const sessionMetadataCache = new Map<
  string,
  {
    did: string;
    lastSeen: number;
    profileFetchNeeded: boolean;
  }
>();

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

    // OPTIMIZATION: Check session metadata cache first (avoids DB query)
    const cachedMetadata = sessionMetadataCache.get(sessionId);
    const now = Date.now();

    let did: string;

    if (cachedMetadata && now - cachedMetadata.lastSeen < 60000) {
      // Session seen within last minute, trust the cache
      did = cachedMetadata.did;
      console.log("Session metadata from cache");
    } else {
      // Need to verify session from database
      const userSession = await userSessions.get(sessionId);
      if (!userSession) {
        // Clear stale cache entry
        sessionMetadataCache.delete(sessionId);
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Invalid or expired session" }),
        };
      }

      did = userSession.did;

      // Update session metadata cache
      sessionMetadataCache.set(sessionId, {
        did,
        lastSeen: now,
        profileFetchNeeded: true,
      });

      // Cleanup: Remove old session metadata entries
      if (sessionMetadataCache.size > 200) {
        for (const [sid, meta] of sessionMetadataCache.entries()) {
          if (now - meta.lastSeen > 300000) {
            // 5 minutes
            sessionMetadataCache.delete(sid);
          }
        }
      }
    }

    // Check profile cache (Tier 1)
    const cached = profileCache.get(did);
    if (cached && now - cached.timestamp < PROFILE_CACHE_TTL) {
      console.log("Returning cached profile for", did);

      // Update session metadata last seen
      const meta = sessionMetadataCache.get(sessionId);
      if (meta) {
        meta.lastSeen = now;
      }

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
      const config = getOAuthConfig();
      const isDev = config.clientType === "loopback";

      let client: NodeOAuthClient;

      if (isDev) {
        // Loopback
        const clientMetadata = atprotoLoopbackClientMetadata(config.clientId);
        client = new NodeOAuthClient({
          clientMetadata: clientMetadata,
          stateStore: stateStore as any,
          sessionStore: sessionStore as any,
        });
      } else {
        // Production with private key
        const normalizedKey = normalizePrivateKey(
          process.env.OAUTH_PRIVATE_KEY!,
        );
        const privateKey = await JoseKey.fromImportable(
          normalizedKey,
          "main-key",
        );

        client = new NodeOAuthClient({
          clientMetadata: {
            client_id: config.clientId,
            client_name: "ATlast",
            client_uri: config.clientId.replace("/client-metadata.json", ""),
            redirect_uris: [config.redirectUri],
            scope: "atproto transition:generic",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            application_type: "web",
            token_endpoint_auth_method: "private_key_jwt",
            token_endpoint_auth_signing_alg: "ES256",
            dpop_bound_access_tokens: true,
            jwks_uri: config.jwksUri,
          },
          keyset: [privateKey],
          stateStore: stateStore as any,
          sessionStore: sessionStore as any,
        });
      }

      // Restore OAuth session
      const oauthSession = await client.restore(did);

      // Create agent from OAuth session
      const agent = new Agent(oauthSession);

      // Get profile
      const profile = await agent.getProfile({ actor: did });

      const profileData = {
        did: did,
        handle: profile.data.handle,
        displayName: profile.data.displayName,
        avatar: profile.data.avatar,
        description: profile.data.description,
      };

      // Cache the profile data (Tier 1)
      profileCache.set(did, {
        data: profileData,
        timestamp: now,
      });

      // Update session metadata (Tier 2)
      const meta = sessionMetadataCache.get(sessionId);
      if (meta) {
        meta.lastSeen = now;
        meta.profileFetchNeeded = false;
      }

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
