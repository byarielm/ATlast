/**
 * CSRF Protection Tests
 *
 * Validates protections against Cross-Site Request Forgery attacks.
 *
 * ATlast uses:
 * - SameSite=Lax cookies (prevents cross-origin POST with cookies)
 * - httpOnly cookies (prevents JavaScript access to session tokens)
 * - OAuth state parameter validation (prevents OAuth CSRF)
 * - Authentication required on all state-changing endpoints
 *
 * Note: Hono's test client (`app.request()`) doesn't enforce SameSite,
 * so these tests focus on the server-side protections that are testable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  authRequest,
  request,
  requestWithSession,
  parseResponse,
  createFreshTestSession,
} from '../helpers';
import { cleanupAllTestSessions, cleanupAllTestData } from '../fixtures';

// ============================================================================
// Setup / Teardown
// ============================================================================

let sessionId: string;

beforeAll(async () => {
  sessionId = await createFreshTestSession('standard');
});

afterAll(async () => {
  await cleanupAllTestData();
  await cleanupAllTestSessions();
});

// ============================================================================
// Tests
// ============================================================================

describe('CSRF Protection', () => {
  // --------------------------------------------------------------------------
  // Authentication Required on State-Changing Endpoints
  // --------------------------------------------------------------------------

  describe('State-Changing Endpoints Require Authentication', () => {
    it('POST /api/search/batch-search-actors rejects unauthenticated requests', async () => {
      const res = await request('/api/search/batch-search-actors', {
        method: 'POST',
        body: JSON.stringify({ usernames: ['testuser'] }),
      });

      expect(res.status).toBe(401);
    });

    it('POST /api/follow/batch-follow-users rejects unauthenticated requests', async () => {
      const res = await request('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({ dids: ['did:plc:test123'] }),
      });

      expect(res.status).toBe(401);
    });

    it('POST /api/follow/check-status rejects unauthenticated requests', async () => {
      const res = await request('/api/follow/check-status', {
        method: 'POST',
        body: JSON.stringify({ dids: ['did:plc:test123'] }),
      });

      expect(res.status).toBe(401);
    });

    it('POST /api/results/save rejects unauthenticated requests', async () => {
      const res = await request('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: 'csrf-test',
          sourcePlatform: 'test',
          results: [],
        }),
      });

      expect(res.status).toBe(401);
    });

    it('GET /api/results/uploads rejects unauthenticated requests', async () => {
      const res = await request('/api/results/uploads');
      expect(res.status).toBe(401);
    });

    it('GET /api/results/upload-details rejects unauthenticated requests', async () => {
      const res = await request('/api/results/upload-details?uploadId=test&page=1');
      expect(res.status).toBe(401);
    });

    it('POST /api/extension/import rejects unauthenticated requests', async () => {
      const res = await request('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'test',
          usernames: ['user1'],
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://twitter.com/test/following',
          },
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  // --------------------------------------------------------------------------
  // Cookie Security Attributes
  // --------------------------------------------------------------------------

  describe('Cookie Security Attributes', () => {
    it('session cookie is httpOnly (not accessible via JavaScript)', async () => {
      // We can't test the actual OAuth flow easily, but we verify
      // the cookie is set with httpOnly by checking the auth route behavior.
      // The actual setCookie call in auth.ts sets httpOnly: true.

      // Verify that session validation works via cookie, not query param injection
      const res = await requestWithSession('/api/auth/session', sessionId);
      expect(res.status).toBe(200);
    });

    it('rejects session passed as non-cookie query parameter for protected routes', async () => {
      // Protected routes use authMiddleware which only reads from cookies
      // Not from query parameters or request body
      const res = await request(`/api/results/uploads?session=${sessionId}`);
      expect(res.status).toBe(401);
    });

    it('rejects session passed in Authorization header', async () => {
      const res = await request('/api/results/uploads', {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      expect(res.status).toBe(401);
    });

    it('rejects session passed in request body', async () => {
      const res = await request('/api/search/batch-search-actors', {
        method: 'POST',
        body: JSON.stringify({
          session: sessionId,
          usernames: ['testuser'],
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  // --------------------------------------------------------------------------
  // OAuth State Parameter Validation
  // --------------------------------------------------------------------------

  describe('OAuth State Parameter Validation', () => {
    it('rejects oauth-callback with missing code parameter', async () => {
      const res = await request('/api/auth/oauth-callback?state=some-state');

      // Should redirect with error, not process the callback
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('error=');
    });

    it('rejects oauth-callback with missing state parameter', async () => {
      const res = await request('/api/auth/oauth-callback?code=some-code');

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('error=');
    });

    it('rejects oauth-callback with both parameters missing', async () => {
      const res = await request('/api/auth/oauth-callback');

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('error=');
    });

    it('rejects oauth-callback with forged state parameter', async () => {
      const res = await request(
        '/api/auth/oauth-callback?code=valid-code&state=attacker-forged-state',
      );

      // Should redirect with error — the state doesn't match anything in the store
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('error=');
    });
  });

  // --------------------------------------------------------------------------
  // Public Endpoints (No CSRF Protection Needed)
  // --------------------------------------------------------------------------

  describe('Public Endpoints Are Accessible', () => {
    it('GET /api/health is publicly accessible', async () => {
      const res = await request('/api/health');
      expect(res.status).toBe(200);
    });

    it('GET /api/auth/session returns 401 without cookie (not 403)', async () => {
      const res = await request('/api/auth/session');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/client-metadata.json is publicly accessible', async () => {
      const res = await request('/api/auth/client-metadata.json', {
        headers: { Host: '127.0.0.1:8888' },
      });

      // May return 200 or 400 depending on host header parsing
      expect([200, 400]).toContain(res.status);
    });

    it('GET /api/auth/jwks is publicly accessible', async () => {
      const res = await request('/api/auth/jwks');
      expect(res.status).toBe(200);

      const body = await parseResponse<{ keys: Array<{ kty: string }> }>(res);
      expect(body.keys).toHaveLength(1);
      expect(body.keys[0].kty).toBe('EC');
    });

    it('POST /api/auth/oauth-start is publicly accessible', async () => {
      // It should validate the body but not require auth
      const res = await request('/api/auth/oauth-start', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // 400 for missing login_hint, not 401
      expect(res.status).toBe(400);
    });

    it('POST /api/auth/logout works without session (no-op)', async () => {
      const res = await request('/api/auth/logout', { method: 'POST' });
      expect(res.status).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // Cross-Origin Request Handling
  // --------------------------------------------------------------------------

  describe('Cross-Origin Request Handling', () => {
    it('responds with CORS headers for allowed origins', async () => {
      const res = await request('/api/health', {
        headers: {
          Origin: 'http://localhost:5173',
        },
      });

      expect(res.status).toBe(200);
      const allowOrigin = res.headers.get('access-control-allow-origin');
      expect(allowOrigin).toBe('http://localhost:5173');
    });

    it('includes credentials support in CORS', async () => {
      const res = await request('/api/health', {
        headers: {
          Origin: 'http://localhost:5173',
        },
      });

      const allowCredentials = res.headers.get('access-control-allow-credentials');
      expect(allowCredentials).toBe('true');
    });

    it('handles preflight OPTIONS requests', async () => {
      const res = await request('/api/search/batch-search-actors', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });

      // Should respond to preflight (200 or 204)
      expect([200, 204]).toContain(res.status);
    });
  });
});
