/**
 * Session Service for Hono
 * Handles OAuth session management and agent creation
 */

import { Agent } from '@atproto/api';
import type { NodeOAuthClient } from '@atproto/oauth-client-node';
import { Context } from 'hono';
import { createOAuthClient } from '../infrastructure/oauth/OAuthClientFactory';
import { userSessionStore, sessionStore } from '../infrastructure/oauth';
import { AuthenticationError, ERROR_MESSAGES } from '../errors';

// Simple in-memory cache for OAuth clients (5 min expiry)
const clientCache = new Map<
  string,
  { client: NodeOAuthClient; expiresAt: number }
>();

export class SessionService {
  /**
   * Get an authenticated agent for a session
   * Handles session validation, OAuth client creation, and agent restoration
   */
  static async getAgentForSession(
    sessionId: string,
    c: Context,
  ): Promise<{
    agent: Agent;
    did: string;
    client: NodeOAuthClient;
  }> {
    console.log('[SessionService] Getting agent for session:', sessionId);

    // Get user session
    const userSession = await userSessionStore.get(sessionId);
    if (!userSession) {
      throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
    }

    const did = userSession.did;
    console.log('[SessionService] Found user session for DID:', did);

    // Cache the OAuth client per session for 5 minutes
    const host = c.req.header('host') || 'default';
    const cacheKey = `oauth-client-${sessionId}-${host}`;
    const cached = clientCache.get(cacheKey);

    let client: NodeOAuthClient;

    if (cached && cached.expiresAt > Date.now()) {
      client = cached.client;
      console.log('[SessionService] Using cached OAuth client');
    } else {
      client = await createOAuthClient(c);
      clientCache.set(cacheKey, {
        client,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });
      console.log('[SessionService] Created and cached OAuth client');
    }

    try {
      const oauthSession = await client.restore(did);
      console.log('[SessionService] Restored OAuth session for DID:', did);

      // Log token rotation for monitoring
      const sessionData = await sessionStore.get(did);
      if (sessionData) {
        console.log('[SessionService] OAuth session restored/refreshed');
      }

      const agent = new Agent(oauthSession);
      return { agent, did, client };
    } catch (error) {
      console.error(
        '[SessionService] Failed to restore session:',
        error instanceof Error ? error.message : String(error),
      );
      // Clear the cached client if restore fails
      clientCache.delete(cacheKey);
      throw new AuthenticationError(
        'Failed to restore OAuth session',
        error instanceof Error ? error.message : 'Session restoration failed',
      );
    }
  }

  /**
   * Delete a session (logout)
   */
  static async deleteSession(sessionId: string, c: Context): Promise<void> {
    console.log('[SessionService] Deleting session:', sessionId);

    const userSession = await userSessionStore.get(sessionId);
    if (!userSession) {
      console.log('[SessionService] Session not found:', sessionId);
      return;
    }

    const did = userSession.did;

    try {
      const client = await createOAuthClient(c);
      await client.revoke(did);
      console.log('[SessionService] Revoked OAuth session for DID:', did);
    } catch (error) {
      console.log('[SessionService] Could not revoke OAuth session:', error);
    }

    await userSessionStore.del(sessionId);

    // Clear cached OAuth client
    const host = c.req.header('host') || 'default';
    clientCache.delete(`oauth-client-${sessionId}-${host}`);

    console.log('[SessionService] Deleted user session:', sessionId);
  }

  /**
   * Verify session exists
   */
  static async verifySession(sessionId: string): Promise<boolean> {
    const userSession = await userSessionStore.get(sessionId);
    return userSession !== undefined;
  }

  /**
   * Get DID for session
   */
  static async getDIDForSession(sessionId: string): Promise<string | null> {
    const userSession = await userSessionStore.get(sessionId);
    return userSession?.did || null;
  }
}
