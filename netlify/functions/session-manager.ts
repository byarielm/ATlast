import { Agent } from "@atproto/api";
import { createOAuthClient } from "./client";
import { userSessions } from "./oauth-stores-db";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";

/**
 * Session Manager - Coordinates between user sessions and OAuth sessions
 * Provides a clean interface for session operations across the application
 */
export class SessionManager {
  /**
   * Get an authenticated Agent for a given session ID
   * Handles both user session lookup and OAuth session restoration
   */
  static async getAgentForSession(sessionId: string): Promise<{
    agent: Agent;
    did: string;
    client: NodeOAuthClient;
  }> {
    console.log("[SessionManager] Getting agent for session:", sessionId);

    // Get user session
    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      throw new Error("Invalid or expired session");
    }

    const did = userSession.did;
    console.log("[SessionManager] Found user session for DID:", did);

    // Create OAuth client
    const client = await createOAuthClient();

    // Restore OAuth session
    const oauthSession = await client.restore(did);
    console.log("[SessionManager] Restored OAuth session for DID:", did);

    // Create agent from OAuth session
    const agent = new Agent(oauthSession);

    return { agent, did, client };
  }

  /**
   * Delete a session and clean up associated OAuth sessions
   * Ensures both user_sessions and oauth_sessions are cleaned up
   */
  static async deleteSession(sessionId: string): Promise<void> {
    console.log("[SessionManager] Deleting session:", sessionId);

    // Get user session first
    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      console.log("[SessionManager] Session not found:", sessionId);
      return;
    }

    const did = userSession.did;

    try {
      // Create OAuth client and revoke the session
      const client = await createOAuthClient();

      // Try to revoke at the PDS (this also deletes from oauth_sessions)
      await client.revoke(did);
      console.log("[SessionManager] Revoked OAuth session for DID:", did);
    } catch (error) {
      // If revocation fails, the OAuth session might already be invalid
      console.log("[SessionManager] Could not revoke OAuth session:", error);
    }

    // Delete user session
    await userSessions.del(sessionId);
    console.log("[SessionManager] Deleted user session:", sessionId);
  }

  /**
   * Verify a session exists and is valid
   */
  static async verifySession(sessionId: string): Promise<boolean> {
    const userSession = await userSessions.get(sessionId);
    return userSession !== null;
  }

  /**
   * Get the DID for a session without creating an agent
   */
  static async getDIDForSession(sessionId: string): Promise<string | null> {
    const userSession = await userSessions.get(sessionId);
    return userSession?.did || null;
  }
}
