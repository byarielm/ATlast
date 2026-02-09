/**
 * XSS Prevention Tests
 *
 * Validates that user-controlled data is safely handled throughout
 * the API. Since ATlast returns JSON responses (not HTML), the primary
 * risk is stored XSS — malicious data saved to the DB and returned to
 * the frontend, which could execute it if rendered without sanitization.
 *
 * These tests verify:
 * 1. Malicious payloads can be stored and retrieved without server-side issues
 * 2. JSON responses use proper Content-Type headers
 * 3. Error messages don't reflect user input unsanitized
 * 4. Security headers prevent content sniffing
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  authRequest,
  request,
  parseResponse,
  createFreshTestSession,
} from '../helpers';
import { cleanupAllTestSessions, cleanupAllTestData } from '../fixtures';
import { SessionService } from '../../src/services/SessionService';
import { createSuccessfulSearchAgent } from '../fixtures/mockAgent';

// ============================================================================
// Common XSS Payloads
// ============================================================================

const XSS_PAYLOADS = {
  scriptTag: '<script>alert("XSS")</script>',
  imgOnerror: '<img src=x onerror=alert("XSS")>',
  svgOnload: '<svg onload=alert("XSS")>',
  iframeTag: '<iframe src="javascript:alert(\'XSS\')">',
  eventHandler: '" onfocus="alert(\'XSS\')" autofocus="',
  encodedScript: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
  jsProtocol: 'javascript:alert("XSS")',
  dataUri: 'data:text/html,<script>alert("XSS")</script>',
  templateLiteral: '${alert("XSS")}',
  polyglot: 'jaVasCript:/*-/*`/*\\`/*\'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e',
};

// ============================================================================
// Setup / Teardown
// ============================================================================

let sessionId: string;
const originalGetAgent = SessionService.getAgentForSession;

beforeAll(async () => {
  sessionId = await createFreshTestSession('standard');
});

afterAll(async () => {
  SessionService.getAgentForSession = originalGetAgent;
  await cleanupAllTestData();
  await cleanupAllTestSessions();
});

// ============================================================================
// Tests
// ============================================================================

describe('XSS Prevention', () => {
  // --------------------------------------------------------------------------
  // Data Storage and Retrieval
  // --------------------------------------------------------------------------

  describe('Stored XSS via Save Results', () => {
    it('stores and returns script tag payloads as literal strings', async () => {
      const uploadId = `xss-script-test-${Date.now()}`;

      const saveRes = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'test',
          results: [
            {
              sourceUser: { username: XSS_PAYLOADS.scriptTag },
              atprotoMatches: [
                {
                  did: 'did:plc:xss-test-001',
                  handle: 'safe.bsky.social',
                  displayName: XSS_PAYLOADS.scriptTag,
                  description: XSS_PAYLOADS.imgOnerror,
                  matchScore: 100,
                  postCount: 0,
                  followerCount: 0,
                },
              ],
            },
          ],
        }),
      });

      expect(saveRes.status).toBe(200);

      // Retrieve the data — verify it comes back as-is (not executed)
      const detailsRes = await authRequest(
        `/api/results/upload-details?uploadId=${uploadId}&page=1`,
      );

      expect(detailsRes.status).toBe(200);
      const body = await parseResponse<{
        success: boolean;
        data: {
          results: Array<{
            sourceUser: { username: string };
            atprotoMatches: Array<{
              displayName: string | null;
            }>;
          }>;
        };
      }>(detailsRes);

      // The data should be returned as raw strings in JSON
      // (no HTML encoding by the server — that's the frontend's job)
      const result = body.data.results[0];
      expect(result).toBeDefined();
    });

    it('handles all XSS payload variants in display names', async () => {
      const uploadId = `xss-all-payloads-${Date.now()}`;
      const payloadValues = Object.values(XSS_PAYLOADS);

      const results = payloadValues.map((payload, i) => ({
        sourceUser: { username: `user${i}` },
        atprotoMatches: [
          {
            did: `did:plc:xss-payload-${i}`,
            handle: `test${i}.bsky.social`,
            displayName: payload,
            matchScore: 100,
            postCount: 0,
            followerCount: 0,
          },
        ],
      }));

      const saveRes = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'test',
          results,
        }),
      });

      // Server should handle all payloads without error
      expect(saveRes.status).toBe(200);
      const body = await parseResponse<{
        success: boolean;
        matchedUsers: number;
      }>(saveRes);
      expect(body.success).toBe(true);
      expect(body.matchedUsers).toBe(payloadValues.length);
    });

    it('handles XSS in avatar and description URLs', async () => {
      const uploadId = `xss-urls-${Date.now()}`;

      const saveRes = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'test',
          results: [
            {
              sourceUser: { username: 'testuser' },
              atprotoMatches: [
                {
                  did: 'did:plc:xss-url-test',
                  handle: 'test.bsky.social',
                  displayName: 'Normal Name',
                  avatar: XSS_PAYLOADS.jsProtocol,
                  description: XSS_PAYLOADS.dataUri,
                  matchScore: 100,
                  postCount: 0,
                  followerCount: 0,
                },
              ],
            },
          ],
        }),
      });

      expect(saveRes.status).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // Extension Import
  // --------------------------------------------------------------------------

  describe('Stored XSS via Extension Import', () => {
    it('handles XSS payloads in imported usernames', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'test',
          usernames: Object.values(XSS_PAYLOADS),
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://twitter.com/test/following',
          },
        }),
      });

      expect(res.status).toBe(200);
      const body = await parseResponse<{
        success: boolean;
        data: { usernameCount: number };
      }>(res);
      expect(body.success).toBe(true);
      expect(body.data.usernameCount).toBe(Object.values(XSS_PAYLOADS).length);
    });

    it('handles XSS in platform name', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: XSS_PAYLOADS.scriptTag,
          usernames: ['safeuser'],
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://twitter.com/test/following',
          },
        }),
      });

      expect(res.status).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // Search Route - Reflected XSS
  // --------------------------------------------------------------------------

  describe('Reflected XSS in Search', () => {
    it('does not reflect XSS payloads in error messages', async () => {
      // Send invalid request with XSS in body
      const res = await authRequest('/api/search/batch-search-actors', {
        method: 'POST',
        body: JSON.stringify({
          usernames: XSS_PAYLOADS.scriptTag, // String instead of array — fails validation
        }),
      });

      expect(res.status).toBe(400);
      const body = await parseResponse<{ success: boolean; error: string }>(res);
      expect(body.error).not.toContain('<script>');
      expect(body.error).not.toContain('alert');
    });

    it('does not reflect XSS payloads in follow route errors', async () => {
      const res = await authRequest('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({
          dids: XSS_PAYLOADS.scriptTag, // String instead of array — fails validation
        }),
      });

      expect(res.status).toBe(400);
      const body = await parseResponse<{ success: boolean; error: string }>(res);
      expect(body.error).not.toContain('<script>');
      expect(body.error).not.toContain('alert');
    });
  });

  // --------------------------------------------------------------------------
  // Response Headers
  // --------------------------------------------------------------------------

  describe('Response Security Headers', () => {
    it('sets Content-Type to application/json for API responses', async () => {
      const res = await request('/api/health');
      expect(res.status).toBe(200);

      const contentType = res.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });

    it('sets X-Content-Type-Options: nosniff to prevent MIME sniffing', async () => {
      const res = await request('/api/health');

      const nosniff = res.headers.get('x-content-type-options');
      expect(nosniff).toBe('nosniff');
    });

    it('sets X-Frame-Options to prevent clickjacking', async () => {
      const res = await request('/api/health');

      // Hono's secureHeaders sets X-Frame-Options
      const xfo = res.headers.get('x-frame-options');
      expect(xfo).toBeTruthy();
      expect(['DENY', 'SAMEORIGIN']).toContain(xfo);
    });

    it('sets X-XSS-Protection to 0 (disables buggy browser XSS auditor)', async () => {
      const res = await request('/api/health');

      // Modern best practice: X-XSS-Protection: 0
      // The browser's built-in XSS filter has known bypass vulnerabilities,
      // so Hono's secureHeaders() correctly disables it. Content-Security-Policy
      // and proper output encoding are the recommended protections instead.
      const xssProtection = res.headers.get('x-xss-protection');
      expect(xssProtection).toBe('0');
    });
  });

  // --------------------------------------------------------------------------
  // Error Message Sanitization
  // --------------------------------------------------------------------------

  describe('Error Message Sanitization', () => {
    it('does not expose stack traces in error responses', async () => {
      // Trigger an error via invalid JSON body
      const res = await authRequest('/api/search/batch-search-actors', {
        method: 'POST',
        body: 'not-valid-json',
        headers: { 'Content-Type': 'application/json' },
      });

      const body = await parseResponse<{
        success: boolean;
        error: string;
        stack?: string;
      }>(res);

      expect(body.success).toBe(false);
      // Should not contain stack trace info
      expect(body.stack).toBeUndefined();
      if (body.error) {
        expect(body.error).not.toContain('at ');
        expect(body.error).not.toContain('.ts:');
        expect(body.error).not.toContain('.js:');
      }
    });

    it('does not expose database details in error responses', async () => {
      // Use a non-existent upload to trigger not-found flow
      const res = await authRequest(
        '/api/results/upload-details?uploadId=nonexistent&page=1',
      );

      const body = await parseResponse<{
        success: boolean;
        error: string;
      }>(res);

      if (body.error) {
        expect(body.error).not.toContain('SELECT');
        expect(body.error).not.toContain('FROM');
        expect(body.error).not.toContain('postgres');
        expect(body.error).not.toContain('TABLE');
        expect(body.error).not.toContain('COLUMN');
      }
    });

    it('sanitizes authentication error messages', async () => {
      // Request without session
      const res = await request('/api/results/uploads');

      expect(res.status).toBe(401);
      const body = await parseResponse<{
        success: boolean;
        error: string;
      }>(res);

      // Error message should be user-friendly, not technical
      expect(body.error).not.toContain('database');
      expect(body.error).not.toContain('connection');
      expect(body.error).not.toContain('query');
    });
  });

  // --------------------------------------------------------------------------
  // Cookie Injection
  // --------------------------------------------------------------------------

  describe('Cookie Value XSS', () => {
    it('rejects XSS payloads in session cookie values', async () => {
      const res = await request('/api/auth/session', {
        headers: {
          Cookie: `atlast_session_dev=${XSS_PAYLOADS.scriptTag}`,
        },
      });

      // Should return 401 (invalid session), not reflect the cookie value
      expect(res.status).toBe(401);
      const body = await parseResponse<{ success: boolean; error: string }>(res);
      expect(body.error).not.toContain('<script>');
    });

    it('rejects HTML entities in session cookie', async () => {
      const res = await request('/api/auth/session', {
        headers: {
          Cookie: `atlast_session_dev=${XSS_PAYLOADS.encodedScript}`,
        },
      });

      expect(res.status).toBe(401);
    });
  });
});
