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
});
