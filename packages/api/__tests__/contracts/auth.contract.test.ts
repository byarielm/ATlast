/**
 * Auth API Contract Tests
 *
 * Validates that auth endpoint responses match expected Zod schemas.
 * - GET /api/auth/session
 * - POST /api/auth/logout
 * - GET /api/auth/client-metadata.json
 * - GET /api/auth/jwks
 *
 * Note: oauth-start and oauth-callback involve redirects / external OAuth
 * providers and are tested separately in integration tests.
 */

import { describe, it, expect } from 'vitest';
import { authRequest, parseResponse, request, requestWithSession } from '../helpers';
import {
  SessionSuccessSchema,
  SessionErrorSchema,
  LogoutSuccessSchema,
  ClientMetadataLoopbackSchema,
  JwksResponseSchema,
  JwkSchema,
} from '../../src/types/schemas';

describe('Auth API Contract', () => {
  // ========================================================================
  // GET /api/auth/session
  // ========================================================================

  describe('GET /api/auth/session', () => {
    it('authenticated session matches SessionSuccessSchema', async () => {
      const res = await authRequest('/api/auth/session');

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = SessionSuccessSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('session data contains valid DID format', async () => {
      const res = await authRequest('/api/auth/session');
      const body = await parseResponse<{
        data: { did: string; sessionId: string };
      }>(res);

      expect(body.data.did).toMatch(/^did:/);
      expect(body.data.sessionId).toBeTruthy();
    });

    it('success response has no unexpected top-level keys', async () => {
      const res = await authRequest('/api/auth/session');
      const body = await parseResponse<Record<string, unknown>>(res);

      const expectedKeys = ['success', 'data'];
      const unexpectedKeys = Object.keys(body).filter(
        (k) => !expectedKeys.includes(k),
      );
      expect(unexpectedKeys).toEqual([]);
    });

    it('missing session returns error matching SessionErrorSchema', async () => {
      const res = await request('/api/auth/session');

      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      const result = SessionErrorSchema.safeParse(body);

      expect(result.success).toBe(true);
    });

    it('invalid session returns error matching SessionErrorSchema', async () => {
      const res = await requestWithSession(
        '/api/auth/session',
        'nonexistent-session-id-12345',
      );

      expect(res.status).toBe(401);
      const body = await parseResponse(res);
      const result = SessionErrorSchema.safeParse(body);

      expect(result.success).toBe(true);
    });
  });

  // ========================================================================
  // POST /api/auth/logout
  // ========================================================================

  describe('POST /api/auth/logout', () => {
    it('logout response matches LogoutSuccessSchema', async () => {
      const res = await request('/api/auth/logout', { method: 'POST' });

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = LogoutSuccessSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('logout response has no unexpected keys', async () => {
      const res = await request('/api/auth/logout', { method: 'POST' });
      const body = await parseResponse<Record<string, unknown>>(res);

      const expectedKeys = ['success'];
      const unexpectedKeys = Object.keys(body).filter(
        (k) => !expectedKeys.includes(k),
      );
      expect(unexpectedKeys).toEqual([]);
    });
  });

  // ========================================================================
  // GET /api/auth/client-metadata.json
  // ========================================================================

  describe('GET /api/auth/client-metadata.json', () => {
    it('loopback metadata matches ClientMetadataLoopbackSchema', async () => {
      const res = await request('/api/auth/client-metadata.json', {
        headers: { Host: '127.0.0.1:8888' },
      });

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = ClientMetadataLoopbackSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('loopback metadata has required OAuth fields', async () => {
      const res = await request('/api/auth/client-metadata.json', {
        headers: { Host: '127.0.0.1:8888' },
      });

      const body = await parseResponse<Record<string, unknown>>(res);

      expect(body).toHaveProperty('client_id');
      expect(body).toHaveProperty('redirect_uris');
      expect(body).toHaveProperty('grant_types');
      expect(body).toHaveProperty('response_types');
      expect(body).toHaveProperty('dpop_bound_access_tokens', true);
    });

    it('loopback redirect_uris contains callback path', async () => {
      const res = await request('/api/auth/client-metadata.json', {
        headers: { Host: '127.0.0.1:8888' },
      });

      const body = await parseResponse<{ redirect_uris: string[] }>(res);

      expect(body.redirect_uris).toHaveLength(1);
      expect(body.redirect_uris[0]).toContain('/api/auth/oauth-callback');
    });
  });

  // ========================================================================
  // GET /api/auth/jwks
  // ========================================================================

  describe('GET /api/auth/jwks', () => {
    it('jwks response matches JwksResponseSchema', async () => {
      const res = await request('/api/auth/jwks');

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = JwksResponseSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('each key matches JwkSchema', async () => {
      const res = await request('/api/auth/jwks');
      const body = await parseResponse<{
        keys: Array<Record<string, unknown>>;
      }>(res);

      expect(body.keys.length).toBeGreaterThan(0);

      for (const key of body.keys) {
        const result = JwkSchema.safeParse(key);
        if (!result.success) {
          console.error('JWK validation errors:', result.error.issues);
        }
        expect(result.success).toBe(true);
      }
    });

    it('jwks response has no unexpected top-level keys', async () => {
      const res = await request('/api/auth/jwks');
      const body = await parseResponse<Record<string, unknown>>(res);

      const expectedKeys = ['keys'];
      const unexpectedKeys = Object.keys(body).filter(
        (k) => !expectedKeys.includes(k),
      );
      expect(unexpectedKeys).toEqual([]);
    });

    it('jwk contains EC key parameters', async () => {
      const res = await request('/api/auth/jwks');
      const body = await parseResponse<{
        keys: Array<{ kty: string; crv: string; alg: string }>;
      }>(res);

      const key = body.keys[0];
      expect(key.kty).toBe('EC');
      expect(key.crv).toBe('P-256');
      expect(key.alg).toBe('ES256');
    });
  });
});
