import { Agent } from "@atproto/api";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import type { HandlerEvent } from "@netlify/functions";
import { AuthenticationError, ERROR_MESSAGES } from "../core/errors";
import { createOAuthClient } from "../infrastructure/oauth";
import { userSessions } from "../infrastructure/oauth/stores";
import { configCache } from "../infrastructure/cache/CacheService";

export class SessionService {
  static async getAgentForSession(
    sessionId: string,
    event?: HandlerEvent,
  ): Promise<{
    agent: Agent;
    did: string;
    client: NodeOAuthClient;
  }> {
    console.log("[SessionService] Getting agent for session:", sessionId);

    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
    }

    const did = userSession.did;
    console.log("[SessionService] Found user session for DID:", did);

    // Cache the OAuth client per session for 5 minutes
    const cacheKey = `oauth-client-${sessionId}`;
    let client = configCache.get(cacheKey) as NodeOAuthClient | null;

    if (!client) {
      client = await createOAuthClient(event);
      configCache.set(cacheKey, client, 5 * 60 * 1000); // 5 minutes
      console.log("[SessionService] Created and cached OAuth client");
    } else {
      console.log("[SessionService] Using cached OAuth client");
    }

    const oauthSession = await client.restore(did);
    console.log("[SessionService] Restored OAuth session for DID:", did);

    const agent = new Agent(oauthSession);

    return { agent, did, client };
  }

  static async deleteSession(sessionId: string): Promise<void> {
    console.log("[SessionService] Deleting session:", sessionId);

    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      console.log("[SessionService] Session not found:", sessionId);
      return;
    }

    const did = userSession.did;

    try {
      const client = await createOAuthClient();
      await client.revoke(did);
      console.log("[SessionService] Revoked OAuth session for DID:", did);
    } catch (error) {
      console.log("[SessionService] Could not revoke OAuth session:", error);
    }

    await userSessions.del(sessionId);

    // Clear cached OAuth client
    configCache.delete(`oauth-client-${sessionId}`);

    console.log("[SessionService] Deleted user session:", sessionId);
  }

  static async verifySession(sessionId: string): Promise<boolean> {
    const userSession = await userSessions.get(sessionId);
    return userSession !== undefined;
  }

  static async getDIDForSession(sessionId: string): Promise<string | null> {
    const userSession = await userSessions.get(sessionId);
    return userSession?.did || null;
  }
}
