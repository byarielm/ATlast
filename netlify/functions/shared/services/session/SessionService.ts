import { Agent } from "@atproto/api";
import { createOAuthClient } from "../oauth/client.factory";
import { userSessions } from "./stores";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { AuthenticationError, ERROR_MESSAGES } from "../../constants/errors";

/**
 * Session Manager - Coordinates between user sessions and OAuth sessions
 * Provides a clean interface for session operations across the application
 **/
export class SessionService {
  /**
   * Get an authenticated Agent for a given session ID
   * Handles both user session lookup and OAuth session restoration
   **/
  static async getAgentForSession(sessionId: string): Promise<{
    agent: Agent;
    did: string;
    client: NodeOAuthClient;
  }> {
    console.log("[SessionService] Getting agent for session:", sessionId);

    // Get user session
    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
    }

    const did = userSession.did;
    console.log("[SessionService] Found user session for DID:", did);

    // Create OAuth client
    const client = await createOAuthClient();

    // Restore OAuth session
    const oauthSession = await client.restore(did);
    console.log("[SessionService] Restored OAuth session for DID:", did);

    // Create agent from OAuth session
    const agent = new Agent(oauthSession);

    return { agent, did, client };
  }

  /**
   * Delete a session and clean up associated OAuth sessions
   * Ensures both user_sessions and oauth_sessions are cleaned up
   **/
  static async deleteSession(sessionId: string): Promise<void> {
    console.log("[SessionService] Deleting session:", sessionId);

    // Get user session first
    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      console.log("[SessionService] Session not found:", sessionId);
      return;
    }

    const did = userSession.did;

    try {
      // Create OAuth client and revoke the session
      const client = await createOAuthClient();

      // Try to revoke at the PDS (this also deletes from oauth_sessions)
      await client.revoke(did);
      console.log("[SessionService] Revoked OAuth session for DID:", did);
    } catch (error) {
      // If revocation fails, the OAuth session might already be invalid
      console.log("[SessionService] Could not revoke OAuth session:", error);
    }

    // Delete user session
    await userSessions.del(sessionId);
    console.log("[SessionService] Deleted user session:", sessionId);
  }

  /**
   * Verify a session exists and is valid
   **/
  static async verifySession(sessionId: string): Promise<boolean> {
    const userSession = await userSessions.get(sessionId);
    return userSession !== undefined;
  }

  /**
   * Get the DID for a session without creating an agent
   **/
  static async getDIDForSession(sessionId: string): Promise<string | null> {
    const userSession = await userSessions.get(sessionId);
    return userSession?.did || null;
  }
}
