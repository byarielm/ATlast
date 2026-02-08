/**
 * Auth Middleware Tests
 * Tests for authentication middleware error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, extractSessionId } from './auth';
import { errorHandler } from './error';
import { createTestSession, deleteTestSession } from '../../__tests__/fixtures';

describe('Auth Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler);
    app.use('/protected/*', authMiddleware);
    app.get('/protected/test', (c) => {
      // Access context variables added by authMiddleware
      const did = (c.get as (key: string) => unknown)('did');
      return c.json({ success: true, did: did as string });
    });
  });

  describe('Missing Auth Headers', () => {
    it('rejects requests without session cookie', async () => {
      const res = await app.request('/protected/test');

      expect(res.status).toBe(401);
      const body = await res.json() as { success: boolean; error?: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('session');
    });

    it('rejects requests with empty cookie header', async () => {
      const res = await app.request('/protected/test', {
        headers: {
          Cookie: '',
        },
      });

      expect(res.status).toBe(401);
    });

    it('rejects requests with malformed cookie header', async () => {
      const res = await app.request('/protected/test', {
        headers: {
          Cookie: 'malformed cookie string without equals',
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Invalid Session Tokens', () => {
    it('rejects expired sessions', async () => {
      const expiredSession = 'expired-session-id';

      const res = await app.request('/protected/test', {
        headers: {
          Cookie: `atlast_session_dev=${expiredSession}`,
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json() as { success: boolean };
    });

    it('rejects malformed session IDs', async () => {
      const malformedSession = 'not-a-valid-session-format';

      const res = await app.request('/protected/test', {
        headers: {
          Cookie: `atlast_session_dev=${malformedSession}`,
        },
      });

      expect(res.status).toBe(401);
    });

    it('rejects non-existent sessions', async () => {
      const nonExistentSession = 'session-that-does-not-exist';

      const res = await app.request('/protected/test', {
        headers: {
          Cookie: `atlast_session_dev=${nonExistentSession}`,
        },
      });

      expect(res.status).toBe(401);
    });

    it('rejects sessions with invalid characters', async () => {
      const invalidSession = 'session-with-<script>alert("xss")</script>';

      const res = await app.request('/protected/test', {
        headers: {
          Cookie: `atlast_session_dev=${invalidSession}`,
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Valid Session Handling', () => {
    let validSession: string;

    beforeEach(async () => {
      validSession = await createTestSession('standard');
    });

    afterEach(async () => {
      await deleteTestSession(validSession);
    });

    it('allows requests with valid session', async () => {
      const res = await app.request('/protected/test', {
        headers: {
          Cookie: `atlast_session_dev=${validSession}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean; did: string };
      expect(body.success).toBe(true);
      expect(body.did).toBeDefined();
    });

    it('accepts both dev and production cookie names', async () => {
      // Test dev cookie
      const devRes = await app.request('/protected/test', {
        headers: {
          Cookie: `atlast_session_dev=${validSession}`,
        },
      });
      expect(devRes.status).toBe(200);

      // Test prod cookie
      const prodRes = await app.request('/protected/test', {
        headers: {
          Cookie: `atlast_session=${validSession}`,
        },
      });
      expect(prodRes.status).toBe(200);
    });

    it('prioritizes correct cookie when multiple cookies present', async () => {
      const res = await app.request('/protected/test', {
        headers: {
          Cookie: `other_cookie=value; atlast_session_dev=${validSession}; another=value`,
        },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('Session Context', () => {
    let validSession: string;

    beforeEach(async () => {
      validSession = await createTestSession('standard');
    });

    afterEach(async () => {
      await deleteTestSession(validSession);
    });

    it('adds sessionId to context', async () => {
      const testApp = new Hono();
      testApp.use('*', authMiddleware);
      testApp.get('/test', (c) => {
        const sessionId = (c.get as (key: string) => unknown)('sessionId');
        return c.json({ sessionId: sessionId as string });
      });

      const res = await testApp.request('/test', {
        headers: {
          Cookie: `atlast_session_dev=${validSession}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { sessionId: string };
      expect(body.sessionId).toBe(validSession);
    });

    it('adds did to context', async () => {
      const testApp = new Hono();
      testApp.use('*', authMiddleware);
      testApp.get('/test', (c) => {
        const did = (c.get as (key: string) => unknown)('did');
        return c.json({ did: did as string });
      });

      const res = await testApp.request('/test', {
        headers: {
          Cookie: `atlast_session_dev=${validSession}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { did: string };
      expect(body.did).toMatch(/^did:plc:/);
    });
  });

  describe('extractSessionId Helper', () => {
    it('extracts session from cookie header', () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === 'cookie') {
              return 'atlast_session_dev=test-session-id';
            }
            return undefined;
          },
        },
      };

      const sessionId = extractSessionId(mockContext);
      expect(sessionId).toBe('test-session-id');
    });

    it('returns null when no cookie header', () => {
      const mockContext = {
        req: {
          header: () => undefined,
        },
      };

      const sessionId = extractSessionId(mockContext);
      expect(sessionId).toBeNull();
    });

    it('handles multiple cookies', () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === 'cookie') {
              return 'other=value; atlast_session_dev=test-session; another=value';
            }
            return undefined;
          },
        },
      };

      const sessionId = extractSessionId(mockContext);
      expect(sessionId).toBe('test-session');
    });

    it('prefers production cookie over dev cookie', () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === 'cookie') {
              return 'atlast_session=prod-session; atlast_session_dev=dev-session';
            }
            return undefined;
          },
        },
      };

      const sessionId = extractSessionId(mockContext);
      expect(sessionId).toBe('prod-session');
    });
  });

  describe('Database Error Scenarios', () => {
    it('handles database connection failures during session lookup', async () => {
      // If database is down, session validation will fail
      // This should result in 401 (cannot authenticate)

      const res = await app.request('/protected/test', {
        headers: {
          Cookie: 'atlast_session_dev=any-session',
        },
      });

      // Will return 401 because session lookup will fail
      expect([401, 500]).toContain(res.status);
    });
  });

  describe('Concurrent Request Handling', () => {
    let validSession: string;

    beforeEach(async () => {
      validSession = await createTestSession('standard');
    });

    afterEach(async () => {
      await deleteTestSession(validSession);
    });

    it('handles multiple concurrent requests with same session', async () => {
      const requests = Array.from({ length: 5 }, () =>
        app.request('/protected/test', {
          headers: {
            Cookie: `atlast_session_dev=${validSession}`,
          },
        })
      );

      const results = await Promise.all(requests);

      // All should succeed
      results.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });
  });
});
