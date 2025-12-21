import { Agent } from "@atproto/api";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { SessionSecurityService } from "../core/middleware/session-security.middleware";
import type { HandlerEvent } from "@netlify/functions";
import { AuthenticationError, ERROR_MESSAGES } from "../core/errors";
import { createOAuthClient } from "../infrastructure/oauth";
import { userSessions } from "../infrastructure/oauth/stores";
import { configCache } from "../infrastructure/cache/CacheService";
import { sessionStore } from "../infrastructure/oauth/stores";

export class SessionService {
  static async getAgentForSession(
    sessionId: string,
    event: HandlerEvent,
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

    const currentFingerprint =
      SessionSecurityService.generateFingerprint(event);
    if (
      userSession.fingerprint &&
      !SessionSecurityService.verifyFingerprint(
        userSession.fingerprint,
        currentFingerprint,
      )
    ) {
      throw new AuthenticationError("Session hijacking detected");
    }

    const did = userSession.did;
    console.log("[SessionService] Found user session for DID:", did);

    // Cache the OAuth client per session for 5 minutes
    const host = event.headers?.host || "default";
    const cacheKey = `oauth-client-${sessionId}-${host}`;
    let client = configCache.get(cacheKey) as NodeOAuthClient | null;

    if (!client) {
      client = await createOAuthClient(event);
      configCache.set(cacheKey, client, 5 * 60 * 1000); // 5 minutes
      console.log("[SessionService] Created and cached OAuth client");
    } else {
      console.log("[SessionService] Using cached OAuth client");
    }

    try {
      const oauthSession = await client.restore(did);
      console.log("[SessionService] Restored OAuth session for DID:", did);

      // Log token rotation for monitoring
      // The restore() call automatically refreshes if needed
      const sessionData = await sessionStore.get(did);
      if (sessionData) {
        // Token refresh happens transparently in restore()
        // Just log for monitoring purposes
        console.log("[SessionService] OAuth session restored/refreshed");
      }

      const agent = new Agent(oauthSession);
      return { agent, did, client };
    } catch (error) {
      console.error(
        "[SessionService] Failed to restore session:",
        error instanceof Error ? error.message : String(error),
      );
      // Clear the cached client if restore fails - it might be stale or misconfigured
      configCache.delete(cacheKey);
      throw new AuthenticationError(
        "Failed to restore OAuth session",
        error instanceof Error ? error.message : "Session restoration failed",
      );
    }
  }

  static async deleteSession(
    sessionId: string,
    event?: HandlerEvent,
  ): Promise<void> {
    console.log("[SessionService] Deleting session:", sessionId);

    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      console.log("[SessionService] Session not found:", sessionId);
      return;
    }

    const did = userSession.did;

    try {
      const client = await createOAuthClient(event);
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
