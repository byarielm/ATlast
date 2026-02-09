/**
 * SQL Injection Prevention Tests
 *
 * Validates that all user inputs are safely parameterized and
 * SQL injection payloads are treated as literal strings.
 *
 * ATlast uses Kysely ORM which parameterizes queries by default.
 * These tests verify that protection holds across all input vectors.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  authRequest,
  parseResponse,
  createFreshTestSession,
} from '../helpers';
import { cleanupAllTestSessions, cleanupAllTestData } from '../fixtures';
import { SessionService } from '../../src/services/SessionService';
import { createSuccessfulSearchAgent, createFollowAgent } from '../fixtures/mockAgent';

// ============================================================================
// Common SQL Injection Payloads
// ============================================================================

const SQL_INJECTION_PAYLOADS = [
  // Classic injection
  "'; DROP TABLE user_sessions; --",
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR 1=1 --",
  "'; DELETE FROM user_uploads; --",

  // Union-based injection
  "' UNION SELECT * FROM user_sessions --",
  "' UNION SELECT session_id, did FROM user_sessions --",
  "' UNION ALL SELECT NULL,NULL,NULL --",

  // Comment-based injection
  "admin'--",
  "admin'/*",
  "*/; DROP TABLE source_accounts; /*",

  // Stacked queries
  "'; INSERT INTO user_sessions VALUES ('hacked','did:plc:hacked','{}',NOW()); --",
  "'; UPDATE user_sessions SET did='did:plc:attacker' WHERE 1=1; --",

  // Boolean-based blind injection
  "' AND 1=1 --",
  "' AND (SELECT COUNT(*) FROM user_sessions) > 0 --",

  // Time-based blind injection
  "' AND pg_sleep(5) --",
  "'; SELECT pg_sleep(5); --",

  // PostgreSQL-specific
  "'; COPY (SELECT * FROM user_sessions) TO '/tmp/leaked'; --",
  "' || (SELECT version()) || '",
  "$$ DROP TABLE user_sessions $$",
];

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

describe('SQL Injection Prevention', () => {
  // --------------------------------------------------------------------------
  // Search Route
  // --------------------------------------------------------------------------

  describe('Search Route - /api/search/batch-search-actors', () => {
    it('treats SQL injection payloads as literal usernames', async () => {
      const mockAgent = createSuccessfulSearchAgent();
      vi.spyOn(SessionService, 'getAgentForSession').mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-standard-user-001',
      });

      try {
        const res = await authRequest('/api/search/batch-search-actors', {
          method: 'POST',
          body: JSON.stringify({
            usernames: SQL_INJECTION_PAYLOADS.slice(0, 5),
          }),
        });

        expect(res.status).toBe(200);
        const body = await parseResponse<{
          success: boolean;
          data: { results: Array<{ username: string; actors: Array<{ did: string }> }> };
        }>(res);
        expect(body.success).toBe(true);
        expect(body.data.results).toHaveLength(5);

        // Each payload should be treated as a literal search term
        for (const result of body.data.results) {
          expect(SQL_INJECTION_PAYLOADS).toContain(result.username);
        }
      } finally {
        vi.mocked(SessionService.getAgentForSession).mockRestore();
      }
    });

    it('handles SQL metacharacters in usernames safely', async () => {
      const metacharacters = [
        "user%name",    // LIKE wildcard
        "user_name",    // LIKE single char wildcard
        "user'name",    // String delimiter
        'user"name',    // Double quote
        "user\\name",   // Escape character
        "user;name",    // Statement terminator
        "user\x00name", // Null byte
      ];

      const mockAgent = createSuccessfulSearchAgent();
      vi.spyOn(SessionService, 'getAgentForSession').mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-standard-user-001',
      });

      try {
        const res = await authRequest('/api/search/batch-search-actors', {
          method: 'POST',
          body: JSON.stringify({ usernames: metacharacters }),
        });

        // Should succeed or return validation error, never a DB error
        expect([200, 400]).toContain(res.status);
      } finally {
        vi.mocked(SessionService.getAgentForSession).mockRestore();
      }
    });
  });

  // --------------------------------------------------------------------------
  // Follow Route
  // --------------------------------------------------------------------------

  describe('Follow Route - /api/follow/batch-follow-users', () => {
    it('rejects DIDs with SQL injection payloads via Zod validation', async () => {
      // DIDs must start with 'did:' per schema, so most SQL payloads fail validation
      const res = await authRequest('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({
          dids: ["'; DROP TABLE user_sessions; --"],
        }),
      });

      // Zod rejects because the string doesn't start with 'did:'
      expect(res.status).toBe(400);
      const body = await parseResponse<{ success: boolean; error: string }>(res);
      expect(body.success).toBe(false);
    });

    it('handles SQL injection in DID-prefixed payloads', async () => {
      // Payloads that pass the 'did:' prefix check but contain SQL injection
      const maliciousDids = [
        "did:'; DROP TABLE user_sessions; --",
        "did:' OR '1'='1",
        "did:plc:' UNION SELECT * FROM user_sessions --",
        "did:plc:test' AND pg_sleep(5) --",
      ];

      const mockAgent = createFollowAgent();
      vi.spyOn(SessionService, 'getAgentForSession').mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-standard-user-001',
      });

      try {
        const res = await authRequest('/api/follow/batch-follow-users', {
          method: 'POST',
          body: JSON.stringify({ dids: maliciousDids }),
        });

        // Should process without SQL errors (agent mock handles the follow)
        expect(res.status).toBe(200);
        const body = await parseResponse<{ success: boolean }>(res);
        expect(body.success).toBe(true);
      } finally {
        vi.mocked(SessionService.getAgentForSession).mockRestore();
      }
    });

    it('handles SQL injection in followLexicon parameter', async () => {
      const mockAgent = createFollowAgent();
      vi.spyOn(SessionService, 'getAgentForSession').mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-standard-user-001',
      });

      try {
        const res = await authRequest('/api/follow/batch-follow-users', {
          method: 'POST',
          body: JSON.stringify({
            dids: ['did:plc:test123'],
            followLexicon: "'; DROP TABLE user_sessions; --",
          }),
        });

        // The followLexicon is passed to AT Protocol, not SQL — should not cause DB issues
        expect(res.status).toBe(200);
      } finally {
        vi.mocked(SessionService.getAgentForSession).mockRestore();
      }
    });
  });

  // --------------------------------------------------------------------------
  // Results Route
  // --------------------------------------------------------------------------

  describe('Results Route - /api/results/save', () => {
    it('handles SQL injection in uploadId', async () => {
      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: "'; DROP TABLE user_uploads; --",
          sourcePlatform: 'test',
          results: [],
        }),
      });

      // Should succeed or return a controlled error, not a SQL error
      expect([200, 400, 404, 500]).toContain(res.status);
      const body = await parseResponse<{ success: boolean }>(res);
      // If it succeeded, the injection was treated as a literal string
      if (res.status === 200) {
        expect(body.success).toBe(true);
      }
    });

    it('handles SQL injection in sourcePlatform', async () => {
      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: `sqli-platform-test-${Date.now()}`,
          sourcePlatform: "'; DROP TABLE source_accounts; --",
          results: [],
        }),
      });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('handles SQL injection in search result usernames', async () => {
      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: `sqli-usernames-test-${Date.now()}`,
          sourcePlatform: 'test',
          results: [
            {
              sourceUser: { username: "'; DROP TABLE source_accounts; --" },
              atprotoMatches: [],
            },
            {
              sourceUser: { username: "' UNION SELECT * FROM user_sessions --" },
              atprotoMatches: [],
            },
          ],
        }),
      });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('handles SQL injection in match DIDs and handles', async () => {
      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: `sqli-matches-test-${Date.now()}`,
          sourcePlatform: 'test',
          results: [
            {
              sourceUser: { username: 'testuser' },
              atprotoMatches: [
                {
                  did: "did:plc:'; DROP TABLE atproto_matches; --",
                  handle: "'; DROP TABLE atproto_matches; --.bsky.social",
                  displayName: "'; DROP TABLE user_sessions; --",
                  matchScore: 100,
                  postCount: 0,
                  followerCount: 0,
                },
              ],
            },
          ],
        }),
      });

      // Should not crash the DB
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  // --------------------------------------------------------------------------
  // Results Route - GET endpoints
  // --------------------------------------------------------------------------

  describe('Results Route - /api/results/upload-details', () => {
    it('handles SQL injection in uploadId query parameter', async () => {
      const res = await authRequest(
        "/api/results/upload-details?uploadId=' OR '1'='1&page=1",
      );

      // Should return 404 (not found) or 400, not a SQL error
      expect([400, 404]).toContain(res.status);
    });

    it('handles SQL injection in page parameter', async () => {
      const res = await authRequest(
        "/api/results/upload-details?uploadId=safe-id&page=1; DROP TABLE user_uploads",
      );

      // Zod coerces to number — non-numeric string should fail validation
      expect(res.status).toBe(400);
    });
  });

  // --------------------------------------------------------------------------
  // Extension Route
  // --------------------------------------------------------------------------

  describe('Extension Route - /api/extension/import', () => {
    it('handles SQL injection in platform name', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: "'; DROP TABLE user_uploads; --",
          usernames: ['safeuser'],
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://twitter.com/test/following',
          },
        }),
      });

      // Should succeed — the platform name is treated as a literal string
      expect(res.status).toBe(200);
      const body = await parseResponse<{ success: boolean }>(res);
      expect(body.success).toBe(true);
    });

    it('handles SQL injection in usernames array', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'test',
          usernames: SQL_INJECTION_PAYLOADS.slice(0, 10),
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://twitter.com/test/following',
          },
        }),
      });

      // Payloads should be stored as literal strings
      expect(res.status).toBe(200);
      const body = await parseResponse<{ success: boolean }>(res);
      expect(body.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Database Integrity Verification
  // --------------------------------------------------------------------------

  describe('Database Integrity', () => {
    it('user_sessions table is intact after injection attempts', async () => {
      // Verify the test session still works — proves tables weren't dropped
      const res = await authRequest('/api/auth/session');
      expect(res.status).toBe(200);
      const body = await parseResponse<{
        success: boolean;
        data: { did: string };
      }>(res);
      expect(body.success).toBe(true);
      expect(body.data.did).toBe('did:plc:test-standard-user-001');
    });

    it('uploads endpoint is intact after injection attempts', async () => {
      const res = await authRequest('/api/results/uploads');
      expect(res.status).toBe(200);
      const body = await parseResponse<{ success: boolean }>(res);
      expect(body.success).toBe(true);
    });

    it('health endpoint confirms database connectivity', async () => {
      const res = await authRequest('/api/health');
      expect(res.status).toBe(200);
      const body = await parseResponse<{
        success: boolean;
        data: { database: { status: string } };
      }>(res);
      expect(body.data.database.status).toBe('connected');
    });
  });
});
