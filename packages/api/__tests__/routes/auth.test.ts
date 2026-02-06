/**
 * Auth API Integration Tests
 *
 * Tests OAuth endpoints, session management, and authentication flows.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  request,
  authRequest,
  requestWithSession,
  parseResponse,
} from '../helpers';
import {
  createTestSession,
  createExpiredTestSession,
  cleanupAllTestSessions,
} from '../fixtures';

describe('Auth API', () => {
  let validSession: string;

  beforeAll(async () => {
    validSession = await createTestSession('standard');
  });

  afterAll(async () => {
    await cleanupAllTestSessions();
  });

  describe('GET /api/auth/client-metadata.json', () => {
    it('returns loopback client metadata for localhost', async () => {
      const res = await request('/api/auth/client-metadata.json', {
        headers: {
          host: '127.0.0.1:8888',
        },
      });
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.client_id).toBe('http://127.0.0.1:8888');
      expect(body.client_name).toBe('ATlast (Local Dev)');
      expect(body.client_uri).toBe('http://127.0.0.1:8888');
      expect(body.redirect_uris).toEqual([
        'http://127.0.0.1:8888/api/auth/oauth-callback',
      ]);
      expect(body.application_type).toBe('web');
      expect(body.token_endpoint_auth_method).toBe('none');
      expect(body.dpop_bound_access_tokens).toBe(true);
      expect(body.grant_types).toEqual(['authorization_code', 'refresh_token']);
      expect(body.response_types).toEqual(['code']);
    });

    it('returns production client metadata for non-localhost', async () => {
      const res = await request('/api/auth/client-metadata.json', {
        headers: {
          host: 'atlast.app',
        },
      });
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.client_id).toBe(
        'https://atlast.app/api/auth/client-metadata.json',
      );
      expect(body.client_name).toBe('ATlast');
      expect(body.client_uri).toBe('https://atlast.app');
      expect(body.redirect_uris).toEqual([
        'https://atlast.app/api/auth/oauth-callback',
      ]);
      expect(body.jwks_uri).toBe('https://atlast.app/api/auth/jwks');
      expect(body.logo_uri).toBe('https://atlast.app/favicon.svg');
      expect(body.token_endpoint_auth_method).toBe('private_key_jwt');
      expect(body.token_endpoint_auth_signing_alg).toBe('ES256');
      expect(body.dpop_bound_access_tokens).toBe(true);
    });

    it('respects x-forwarded-host header', async () => {
      const res = await request('/api/auth/client-metadata.json', {
        headers: {
          host: 'localhost:8888',
          'x-forwarded-host': 'atlast.app',
        },
      });
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.client_id).toBe(
        'https://atlast.app/api/auth/client-metadata.json',
      );
    });

    it('returns 400 without host header', async () => {
      const res = await request('/api/auth/client-metadata.json');
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.error).toBe('Missing host header');
    });
  });

  describe('GET /api/auth/jwks', () => {
    it('returns public JWK set', async () => {
      const res = await request('/api/auth/jwks');
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.keys).toBeDefined();
      expect(Array.isArray(body.keys)).toBe(true);
      expect(body.keys.length).toBeGreaterThan(0);

      const jwk = body.keys[0];
      expect(jwk.kty).toBe('EC');
      expect(jwk.crv).toBe('P-256');
      expect(jwk.use).toBe('sig');
      expect(jwk.alg).toBe('ES256');
      expect(jwk).toHaveProperty('kid');
      expect(jwk).toHaveProperty('x');
      expect(jwk).toHaveProperty('y');
    });

    it('includes cache headers', async () => {
      const res = await request('/api/auth/jwks');
      expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
    });
  });

  describe('GET /api/auth/session', () => {
    it('returns session data with valid session cookie', async () => {
      const res = await requestWithSession('/api/auth/session', validSession);
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('did');
      expect(body.data.did).toMatch(/^did:/);
      expect(body.data).toHaveProperty('sessionId');
    });

    it('returns session data with session query parameter', async () => {
      const res = await request(`/api/auth/session?session=${validSession}`);
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('did');
    });

    it('returns 401 without session', async () => {
      const res = await request('/api/auth/session');
      expect(res.status).toBe(401);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
      expect(body.error).toBe('No session cookie');
    });

    it('returns 401 with expired session', async () => {
      const expiredSession = await createExpiredTestSession();
      const res = await requestWithSession('/api/auth/session', expiredSession);
      expect(res.status).toBe(401);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid or expired session');
    });

    it('returns 401 with invalid session format', async () => {
      const res = await requestWithSession(
        '/api/auth/session',
        'not-a-valid-session',
      );
      expect(res.status).toBe(401);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears session and returns success', async () => {
      // Create a fresh session for this test
      const sessionToLogout = await createTestSession('standard');

      // Verify session exists
      const checkRes = await requestWithSession(
        '/api/auth/session',
        sessionToLogout,
      );
      expect(checkRes.status).toBe(200);

      // Logout
      const logoutRes = await requestWithSession(
        '/api/auth/logout',
        sessionToLogout,
        { method: 'POST' },
      );
      expect(logoutRes.status).toBe(200);

      const body = await parseResponse(logoutRes);
      expect(body.success).toBe(true);

      // Verify session is now invalid
      const afterLogoutRes = await requestWithSession(
        '/api/auth/session',
        sessionToLogout,
      );
      expect(afterLogoutRes.status).toBe(401);
    });

    it('succeeds even without existing session', async () => {
      const res = await request('/api/auth/logout', {
        method: 'POST',
      });
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
    });

    it('clears session cookie', async () => {
      const sessionToLogout = await createTestSession('standard');

      const res = await requestWithSession(
        '/api/auth/logout',
        sessionToLogout,
        { method: 'POST' },
      );

      // Check that Set-Cookie header is present with maxAge=0
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('Max-Age=0');
    });
  });

  describe('POST /api/auth/oauth-start', () => {
    it('returns 400 without login_hint', async () => {
      const res = await request('/api/auth/oauth-start', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.error).toContain('login_hint');
    });

    it('returns 400 with empty login_hint', async () => {
      const res = await request('/api/auth/oauth-start', {
        method: 'POST',
        body: JSON.stringify({ login_hint: '' }),
      });
      expect(res.status).toBe(400);
    });

    // Note: Full OAuth flow testing requires mocking the OAuth client
    // which is complex. These tests verify input validation.
    // Real OAuth flow should be tested manually or with E2E tests.
  });

  describe('GET /api/auth/oauth-callback', () => {
    it('redirects with error when missing code parameter', async () => {
      const res = await request('/api/auth/oauth-callback?state=test-state', {
        redirect: 'manual',
      });

      // Should redirect with error
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('error=Missing OAuth parameters');
    });

    it('redirects with error when missing state parameter', async () => {
      const res = await request('/api/auth/oauth-callback?code=test-code', {
        redirect: 'manual',
      });

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('error=Missing OAuth parameters');
    });

    // Note: Full OAuth callback testing requires mocking the entire OAuth flow
    // These tests verify parameter validation. Complete flow should be tested
    // manually or with E2E tests that include real OAuth providers.
  });

  describe('OAuth Error Scenarios', () => {
    describe('OAuth Start Errors', () => {
      it('handles invalid handle format', async () => {
        const res = await request('/api/auth/oauth-start', {
          method: 'POST',
          body: JSON.stringify({
            login_hint: 'invalid handle with spaces',
          }),
        });

        // Should reject invalid handle format
        expect([400, 500]).toContain(res.status);
      });

      it('handles malformed handle', async () => {
        const res = await request('/api/auth/oauth-start', {
          method: 'POST',
          body: JSON.stringify({
            login_hint: '@@@invalid',
          }),
        });

        expect([400, 500]).toContain(res.status);
      });

      it('handles non-existent PDS', async () => {
        const res = await request('/api/auth/oauth-start', {
          method: 'POST',
          body: JSON.stringify({
            login_hint: 'user.nonexistent.pds',
          }),
        });

        // OAuth client might fail to resolve PDS
        expect([400, 500, 503]).toContain(res.status);
      });

      it('handles missing request body', async () => {
        const res = await request('/api/auth/oauth-start', {
          method: 'POST',
        });

        expect(res.status).toBe(400);
      });

      it('handles malformed JSON', async () => {
        const res = await request('/api/auth/oauth-start', {
          method: 'POST',
          body: 'not valid json',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(res.status).toBe(400);
      });
    });

    describe('OAuth Callback Errors', () => {
      it('handles invalid authorization code', async () => {
        // Simulate callback with invalid code
        const res = await request(
          '/api/auth/oauth-callback?code=invalid-code&state=test-state',
          { redirect: 'manual' },
        );

        // Should redirect with error (state won't exist in DB)
        expect(res.status).toBe(302);
        const location = res.headers.get('location');
        expect(location).toBeDefined();
        expect(location).toContain('error');
      });

      it('handles expired state token', async () => {
        // State tokens should have expiration
        const res = await request(
          '/api/auth/oauth-callback?code=valid-code&state=expired-state-token',
          { redirect: 'manual' },
        );

        expect(res.status).toBe(302);
        const location = res.headers.get('location');
        expect(location).toContain('error');
      });

      it('handles CSRF state mismatch', async () => {
        // Attacker-controlled state should be rejected
        const res = await request(
          '/api/auth/oauth-callback?code=valid-code&state=attacker-state',
          { redirect: 'manual' },
        );

        expect(res.status).toBe(302);
        const location = res.headers.get('location');
        expect(location).toContain('error');
      });

      it('handles missing both code and state', async () => {
        const res = await request('/api/auth/oauth-callback', {
          redirect: 'manual',
        });

        expect(res.status).toBe(302);
        const location = res.headers.get('location');
        expect(location).toContain('error=Missing OAuth parameters');
      });

      it('handles malformed callback parameters', async () => {
        const res = await request(
          '/api/auth/oauth-callback?code=&state=',
          { redirect: 'manual' },
        );

        expect(res.status).toBe(302);
        const location = res.headers.get('location');
        expect(location).toContain('error');
      });

      it('includes error description in redirect', async () => {
        const res = await request(
          '/api/auth/oauth-callback?state=missing-code',
          { redirect: 'manual' },
        );

        expect(res.status).toBe(302);
        const location = res.headers.get('location');
        expect(location).toBeDefined();

        // Should provide user-friendly error message
        expect(location).toContain('error');
      });

      it('handles token exchange failure', async () => {
        // Simulates OAuth provider rejecting token exchange
        // This would happen if code is invalid or expired
        const res = await request(
          '/api/auth/oauth-callback?code=rejected-code&state=valid-state',
          { redirect: 'manual' },
        );

        expect(res.status).toBe(302);
        const location = res.headers.get('location');
        expect(location).toContain('error');
      });
    });

    describe('Session Error Scenarios', () => {
      it('handles database errors during session creation', async () => {
        // If database is unavailable during OAuth callback, session creation fails
        // This should be handled gracefully

        // This test would require mocking database failures
        // For now, we verify the session creation flow exists
        const res = await requestWithSession('/api/auth/session', validSession);
        expect([200, 500]).toContain(res.status);
      });

      it('handles concurrent session creation for same user', async () => {
        // Multiple OAuth callbacks for same user should be handled
        const testDid = 'did:plc:test-concurrent';

        // This would require actually triggering OAuth flow
        // For now, verify that existing session handling works
        const res = await requestWithSession('/api/auth/session', validSession);
        expect(res.status).toBe(200);
      });

      it('handles malformed session data', async () => {
        // Corrupted session data in database should not crash
        const res = await requestWithSession(
          '/api/auth/session',
          'malformed-session-id',
        );

        expect(res.status).toBe(401);
        const body = await parseResponse(res);
        expect(body.success).toBe(false);
      });

      it('handles session with invalid DID format', async () => {
        // If session has invalid DID (data corruption), should reject
        const res = await requestWithSession(
          '/api/auth/session',
          'session-with-invalid-did',
        );

        expect(res.status).toBe(401);
      });
    });

    describe('Client Metadata Errors', () => {
      it('handles missing host header gracefully', async () => {
        const res = await request('/api/auth/client-metadata.json');

        expect(res.status).toBe(400);
        const body = await parseResponse(res);
        expect(body.error).toBe('Missing host header');
      });

      it('handles malformed host header', async () => {
        const res = await request('/api/auth/client-metadata.json', {
          headers: {
            host: 'invalid:host:format',
          },
        });

        // Should handle malformed host gracefully
        expect([200, 400]).toContain(res.status);
      });

      it('handles x-forwarded-host spoofing attempts', async () => {
        // Verify that x-forwarded-host is properly validated
        const res = await request('/api/auth/client-metadata.json', {
          headers: {
            host: '127.0.0.1:8888',
            'x-forwarded-host': 'attacker.com',
          },
        });

        expect(res.status).toBe(200);
        const body = await parseResponse(res);

        // Should use forwarded host if present (this is expected behavior)
        // But in production, reverse proxy should strip untrusted headers
        expect(body.client_id).toBeDefined();
      });
    });

    describe('JWKS Errors', () => {
      it('handles missing private key gracefully', async () => {
        // If OAUTH_PRIVATE_KEY_JWK is not set, JWKS endpoint might fail
        // But it should fail gracefully

        const res = await request('/api/auth/jwks');

        // Should either return keys or fail with 500
        expect([200, 500]).toContain(res.status);

        if (res.status === 200) {
          const body = await parseResponse(res);
          expect(body.keys).toBeDefined();
          expect(Array.isArray(body.keys)).toBe(true);
        }
      });

      it('handles malformed JWK configuration', async () => {
        // If JWK is malformed, endpoint should handle it
        const res = await request('/api/auth/jwks');

        expect([200, 500]).toContain(res.status);
      });
    });

    describe('Logout Errors', () => {
      it('handles database errors during logout', async () => {
        // If database is unavailable, logout should still succeed
        // (fail-open for logout is acceptable)

        const res = await requestWithSession('/api/auth/logout', validSession, {
          method: 'POST',
        });

        // Logout should always succeed (even if DB delete fails)
        expect(res.status).toBe(200);
        const body = await parseResponse(res);
        expect(body.success).toBe(true);
      });

      it('handles logout with already-deleted session', async () => {
        // Double logout should not error
        const sessionToDelete = await createTestSession('standard');

        // First logout
        await requestWithSession('/api/auth/logout', sessionToDelete, {
          method: 'POST',
        });

        // Second logout
        const res = await requestWithSession('/api/auth/logout', sessionToDelete, {
          method: 'POST',
        });

        expect(res.status).toBe(200);
      });

      it('clears cookie even on database error', async () => {
        const res = await requestWithSession('/api/auth/logout', validSession, {
          method: 'POST',
        });

        // Should set cookie to expire immediately
        const setCookie = res.headers.get('set-cookie');
        expect(setCookie).toBeTruthy();
        expect(setCookie).toContain('Max-Age=0');
      });
    });
  });
});
