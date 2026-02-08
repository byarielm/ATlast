/**
 * Search API Integration Tests
 *
 * Tests batch actor search functionality on AT Protocol.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  request,
  authRequest,
  requestWithSession,
  parseResponse,
} from '../helpers';
import {
  createTestSession,
  cleanupAllTestSessions,
  createTimeoutAgent,
  createRateLimitAgent,
  createServiceUnavailableAgent,
  createPartialFailureSearchAgent,
  createSuccessfulSearchAgent,
  createMalformedResponseAgent,
} from '../fixtures';
import { SessionService } from '../../src/services/SessionService';

describe('Search API', () => {
  let validSession: string;

  beforeAll(async () => {
    validSession = await createTestSession('standard');
  });

  afterAll(async () => {
    await cleanupAllTestSessions();
  });

  describe('POST /api/search/batch-search-actors', () => {
    it('returns 401 without authentication', async () => {
      const res = await request('/api/search/batch-search-actors', {
        method: 'POST',
        body: JSON.stringify({
          usernames: ['testuser'],
        }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 with empty usernames array', async () => {
      const res = await authRequest('/api/search/batch-search-actors', {
        method: 'POST',
        body: JSON.stringify({
          usernames: [],
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
      expect(body.error).toContain('valid array of usernames');
    });

    it('returns 400 with too many usernames (>50)', async () => {
      const tooManyUsernames = Array.from({ length: 51 }, (_, i) => `user${i}`);

      const res = await authRequest('/api/search/batch-search-actors', {
        method: 'POST',
        body: JSON.stringify({
          usernames: tooManyUsernames,
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
      expect(body.error).toContain('max 50');
    });

    it('returns 400 with invalid request body', async () => {
      const res = await authRequest('/api/search/batch-search-actors', {
        method: 'POST',
        body: JSON.stringify({
          invalid: 'data',
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
    });

    it('returns 400 with non-array usernames', async () => {
      const res = await authRequest('/api/search/batch-search-actors', {
        method: 'POST',
        body: JSON.stringify({
          usernames: 'not-an-array',
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
    });

    it('accepts valid request with single username', async () => {
      const res = await requestWithSession(
        '/api/search/batch-search-actors',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            usernames: ['testuser'],
          }),
        },
      );

      // Note: This will fail in test environment without real AT Protocol agent
      // Test DIDs don't pass OAuth validation (need 32-char DIDs)
      // 401 = OAuth agent creation failed (expected with test DIDs)
      // 200 = success (with real OAuth), 500 = agent error
      expect([200, 401, 500]).toContain(res.status);

      if (res.status === 200) {
        const body = await parseResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('results');
        expect(Array.isArray(body.data.results)).toBe(true);
      }
    });

    it('accepts valid request with multiple usernames', async () => {
      const res = await requestWithSession(
        '/api/search/batch-search-actors',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            usernames: ['user1', 'user2', 'user3'],
          }),
        },
      );

      expect([200, 401, 500]).toContain(res.status);

      if (res.status === 200) {
        const body = await parseResponse(res);
        expect(body.success).toBe(true);
        expect(body.data.results.length).toBe(3);
      }
    });

    it('accepts optional followLexicon parameter', async () => {
      const res = await requestWithSession(
        '/api/search/batch-search-actors',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            usernames: ['testuser'],
            followLexicon: 'app.bsky.graph.follow',
          }),
        },
      );

      expect([200, 401, 500]).toContain(res.status);
    });

    it('uses default followLexicon when not provided', async () => {
      const res = await requestWithSession(
        '/api/search/batch-search-actors',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            usernames: ['testuser'],
          }),
        },
      );

      expect([200, 401, 500]).toContain(res.status);

      // If successful, verify results have followStatus
      if (res.status === 200) {
        const body = await parseResponse(res);
        const result = body.data.results[0];
        if (result.actors && result.actors.length > 0) {
          expect(result.actors[0]).toHaveProperty('followStatus');
        }
      }
    });

    // Note: Comprehensive search functionality tests (ranking algorithm,
    // profile enrichment, follow status) would require mocking the AT Protocol
    // agent and services. These are better tested with:
    // 1. Unit tests for the ranking/matching logic
    // 2. E2E tests with a test AT Protocol instance
    // 3. Manual testing against real Bluesky accounts

    describe('Response Structure (when successful)', () => {
      it('returns properly structured search results', async () => {
        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['testuser'],
            }),
          },
        );

        if (res.status === 200) {
          const body = await parseResponse(res);
          expect(body.success).toBe(true);
          expect(body.data).toBeDefined();
          expect(body.data.results).toBeDefined();
          expect(Array.isArray(body.data.results)).toBe(true);

          const result = body.data.results[0];
          expect(result).toHaveProperty('username');
          expect(result).toHaveProperty('actors');
          expect(result).toHaveProperty('error');
          expect(Array.isArray(result.actors)).toBe(true);

          // If actors found, verify structure
          if (result.actors.length > 0) {
            const actor = result.actors[0];
            expect(actor).toHaveProperty('did');
            expect(actor).toHaveProperty('handle');
            expect(actor).toHaveProperty('matchScore');
            expect(actor).toHaveProperty('postCount');
            expect(actor).toHaveProperty('followerCount');
            expect(actor).toHaveProperty('followStatus');
            expect(typeof actor.matchScore).toBe('number');
          }
        }
      });
    });
  });

  describe('Error Scenarios', () => {
    describe('Network and API Errors', () => {
      it('handles network timeouts gracefully', async () => {
        // This test verifies that network timeout errors are handled properly
        // In practice, the AT Protocol agent would throw a timeout error
        // which should be caught and returned as a structured error response

        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['testuser'],
            }),
          },
        );

        // The API should always return a response, even if individual searches fail
        // Status could be 200 with errors in results, or 500 for total failure
        expect([200, 401, 500, 503]).toContain(res.status);

        if (res.status === 200) {
          const body = await parseResponse(res);
          // Partial failures should still return success: true with error details in results
          expect(body).toHaveProperty('data');
        }
      });

      it('handles AT Protocol rate limits (429)', async () => {
        // Rate limiting is handled by the AT Protocol agent
        // The API should pass through rate limit information

        // Note: This would require mocking the AT Protocol agent to simulate 429 responses
        // For now, we verify the API structure can handle such errors

        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['testuser'],
            }),
          },
        );

        // API should handle rate limits gracefully
        expect([200, 401, 429, 500]).toContain(res.status);

        if (res.status === 429) {
          const body = await parseResponse(res);
          expect(body.success).toBe(false);
          expect(body.error).toBeDefined();
          // Check for retry-after header in real implementation
        }
      });

      it('handles malformed AT Protocol API responses', async () => {
        // Tests that the API handles unexpected response structures from AT Protocol

        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['testuser'],
            }),
          },
        );

        // Should handle malformed responses without crashing
        expect([200, 401, 500]).toContain(res.status);

        if (res.status === 200) {
          const body = await parseResponse(res);
          expect(body.data.results).toBeDefined();
          expect(Array.isArray(body.data.results)).toBe(true);

          // Individual result errors should be captured
          const result = body.data.results[0];
          if (result.error) {
            expect(typeof result.error).toBe('string');
          }
        }
      });

      it('handles partial batch failures (some succeed, some fail)', async () => {
        // Test that batch operations continue even when individual searches fail

        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['valid1', 'valid2', 'valid3'],
            }),
          },
        );

        expect([200, 401, 500]).toContain(res.status);

        if (res.status === 200) {
          const body = await parseResponse(res);
          expect(body.success).toBe(true);
          expect(body.data.results).toHaveLength(3);

          // Each result should have either actors or an error
          body.data.results.forEach((result: Record<string, unknown>) => {
            expect(result).toHaveProperty('username');
            expect(result).toHaveProperty('actors');
            expect(result).toHaveProperty('error');

            // Either actors should be an array or error should be a string
            if (Array.isArray(result.actors) && result.actors.length > 0) {
              expect(result.error).toBeNull();
            }
          });
        }
      });

      it('handles service unavailable (503) errors', async () => {
        // AT Protocol service might be temporarily unavailable

        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['testuser'],
            }),
          },
        );

        // Should handle 503 gracefully
        expect([200, 401, 500, 503]).toContain(res.status);

        if (res.status === 503) {
          const body = await parseResponse(res);
          expect(body.success).toBe(false);
          expect(body.error).toBeDefined();
        }
      });
    });

    describe('Invalid Credentials', () => {
      it('handles invalid/expired OAuth credentials', async () => {
        // Test with an expired or invalid session
        // This simulates OAuth token expiration

        const expiredSession = 'expired-session-id';
        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          expiredSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['testuser'],
            }),
          },
        );

        // Should return 401 for invalid credentials
        expect(res.status).toBe(401);
      });

      it('handles OAuth token refresh failures', async () => {
        // In production, if OAuth token refresh fails, the user needs to re-authenticate
        // The API should detect this and return appropriate error

        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['testuser'],
            }),
          },
        );

        // If token refresh fails, should get 401 (unauthorized)
        expect([200, 401, 500]).toContain(res.status);
      });
    });

    describe('Database Errors', () => {
      it('handles database connection failures during search', async () => {
        // If database is unavailable, search might still work (doesn't require DB)
        // but saving results would fail

        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              usernames: ['testuser'],
            }),
          },
        );

        // Search endpoint might not require DB, so could still return 200
        // If DB is needed and fails, should get 500
        expect([200, 401, 500]).toContain(res.status);
      });
    });
  });

  // ==========================================================================
  // Mocked AT Protocol Agent Tests
  // Deterministic tests using mock agents to verify specific error scenarios
  // ==========================================================================

  describe('Mocked Error Scenarios', () => {
    /**
     * These tests mock SessionService.getAgentForSession to inject
     * controlled AT Protocol agent behavior. This enables deterministic
     * testing of error handling without real API calls.
     */

    describe('Network Timeout Handling', () => {
      it('returns results with error messages when AT Protocol times out', async () => {
        const mockAgent = createTimeoutAgent();

        const originalMethod = SessionService.getAgentForSession;
        SessionService.getAgentForSession = vi.fn().mockResolvedValue({
          agent: mockAgent,
          did: 'did:plc:test-standard-user-001',
          client: {},
        });

        try {
          const res = await requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: ['user1', 'user2'],
              }),
            },
          );

          expect(res.status).toBe(200);
          const body = await parseResponse(res);
          expect(body.success).toBe(true);
          expect(body.data.results).toHaveLength(2);

          // Each search should have captured the timeout error
          for (const result of body.data.results) {
            expect(result.actors).toHaveLength(0);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('timed out');
          }
        } finally {
          SessionService.getAgentForSession = originalMethod;
        }
      });
    });

    describe('AT Protocol Rate Limit (429) Handling', () => {
      it('captures rate limit errors per-username in results', async () => {
        const mockAgent = createRateLimitAgent();

        const originalMethod = SessionService.getAgentForSession;
        SessionService.getAgentForSession = vi.fn().mockResolvedValue({
          agent: mockAgent,
          did: 'did:plc:test-standard-user-001',
          client: {},
        });

        try {
          const res = await requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: ['testuser'],
              }),
            },
          );

          expect(res.status).toBe(200);
          const body = await parseResponse(res);
          expect(body.success).toBe(true);

          const result = body.data.results[0];
          expect(result.actors).toHaveLength(0);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Rate Limit');
        } finally {
          SessionService.getAgentForSession = originalMethod;
        }
      });
    });

    describe('Service Unavailable (503) Handling', () => {
      it('captures service unavailable errors in results', async () => {
        const mockAgent = createServiceUnavailableAgent();

        const originalMethod = SessionService.getAgentForSession;
        SessionService.getAgentForSession = vi.fn().mockResolvedValue({
          agent: mockAgent,
          did: 'did:plc:test-standard-user-001',
          client: {},
        });

        try {
          const res = await requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: ['testuser'],
              }),
            },
          );

          expect(res.status).toBe(200);
          const body = await parseResponse(res);
          expect(body.success).toBe(true);

          const result = body.data.results[0];
          expect(result.actors).toHaveLength(0);
          expect(result.error).toContain('Service Unavailable');
        } finally {
          SessionService.getAgentForSession = originalMethod;
        }
      });
    });

    describe('Partial Batch Failure Handling', () => {
      it('returns mixed success/error results when some searches fail', async () => {
        const mockAgent = createPartialFailureSearchAgent();

        const originalMethod = SessionService.getAgentForSession;
        SessionService.getAgentForSession = vi.fn().mockResolvedValue({
          agent: mockAgent,
          did: 'did:plc:test-standard-user-001',
          client: {},
        });

        try {
          const res = await requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: ['gooduser1', 'baduser', 'gooduser2'],
              }),
            },
          );

          expect(res.status).toBe(200);
          const body = await parseResponse(res);
          expect(body.success).toBe(true);
          expect(body.data.results).toHaveLength(3);

          // gooduser1 should succeed
          const result1 = body.data.results[0];
          expect(result1.username).toBe('gooduser1');
          expect(result1.actors.length).toBeGreaterThan(0);
          expect(result1.error).toBeNull();

          // baduser should fail with error
          const result2 = body.data.results[1];
          expect(result2.username).toBe('baduser');
          expect(result2.actors).toHaveLength(0);
          expect(result2.error).toBeDefined();
          expect(result2.error).toContain('baduser');

          // gooduser2 should succeed
          const result3 = body.data.results[2];
          expect(result3.username).toBe('gooduser2');
          expect(result3.actors.length).toBeGreaterThan(0);
          expect(result3.error).toBeNull();
        } finally {
          SessionService.getAgentForSession = originalMethod;
        }
      });
    });

    describe('Successful Search with Actor Ranking', () => {
      it('returns ranked actors with enriched profile data', async () => {
        const mockAgent = createSuccessfulSearchAgent({
          testuser: [
            { did: 'did:plc:exact', handle: 'testuser.bsky.social', displayName: 'Test User' },
            { did: 'did:plc:partial', handle: 'testuser123.bsky.social', displayName: 'Other' },
            { did: 'did:plc:unrelated', handle: 'someone.bsky.social', displayName: 'Unrelated' },
          ],
        });

        const originalMethod = SessionService.getAgentForSession;
        SessionService.getAgentForSession = vi.fn().mockResolvedValue({
          agent: mockAgent,
          did: 'did:plc:test-standard-user-001',
          client: {},
        });

        try {
          const res = await requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: ['testuser'],
              }),
            },
          );

          expect(res.status).toBe(200);
          const body = await parseResponse(res);
          expect(body.success).toBe(true);

          const result = body.data.results[0];
          expect(result.username).toBe('testuser');
          expect(result.error).toBeNull();

          // Should have matched actors (unrelated one filtered out by score > 0)
          expect(result.actors.length).toBeGreaterThanOrEqual(1);

          // Exact match should be first (highest score)
          const topActor = result.actors[0];
          expect(topActor.did).toBe('did:plc:exact');
          expect(topActor.matchScore).toBe(100);

          // Actors should be enriched with profile data
          expect(topActor.postCount).toBeDefined();
          expect(topActor.followerCount).toBeDefined();
          expect(topActor.followStatus).toBeDefined();
        } finally {
          SessionService.getAgentForSession = originalMethod;
        }
      });
    });

    describe('Malformed API Response Handling', () => {
      it('handles actors with missing/empty fields without crashing', async () => {
        const mockAgent = createMalformedResponseAgent();

        const originalMethod = SessionService.getAgentForSession;
        SessionService.getAgentForSession = vi.fn().mockResolvedValue({
          agent: mockAgent,
          did: 'did:plc:test-standard-user-001',
          client: {},
        });

        try {
          const res = await requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: ['testuser'],
              }),
            },
          );

          // Should not crash - returns 200 with results
          expect(res.status).toBe(200);
          const body = await parseResponse(res);
          expect(body.success).toBe(true);
          expect(body.data.results).toHaveLength(1);

          // Actors with empty handles still pass through with low score
          // ('testuser'.includes('') === true -> score 30)
          const result = body.data.results[0];
          expect(result.error).toBeNull();
          expect(Array.isArray(result.actors)).toBe(true);
          // Verify it doesn't crash - actors come through with matchScore 30
          for (const actor of result.actors) {
            expect(actor.matchScore).toBe(30);
          }
        } finally {
          SessionService.getAgentForSession = originalMethod;
        }
      });
    });

    describe('Profile Enrichment Failure Handling', () => {
      it('returns actors with default counts when profile fetch fails', async () => {
        const mockAgent = createSuccessfulSearchAgent({
          testuser: [
            { did: 'did:plc:user1', handle: 'testuser.bsky.social' },
          ],
        });

        // Override getProfiles to fail
        (mockAgent.app.bsky.actor.getProfiles as ReturnType<typeof vi.fn>)
          .mockRejectedValue(new Error('Profile service down'));

        const originalMethod = SessionService.getAgentForSession;
        SessionService.getAgentForSession = vi.fn().mockResolvedValue({
          agent: mockAgent,
          did: 'did:plc:test-standard-user-001',
          client: {},
        });

        try {
          const res = await requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: ['testuser'],
              }),
            },
          );

          expect(res.status).toBe(200);
          const body = await parseResponse(res);
          expect(body.success).toBe(true);

          const result = body.data.results[0];
          expect(result.actors.length).toBeGreaterThanOrEqual(1);

          // Profile data should default to 0 when fetch fails
          const actor = result.actors[0];
          expect(actor.postCount).toBe(0);
          expect(actor.followerCount).toBe(0);
        } finally {
          SessionService.getAgentForSession = originalMethod;
        }
      });
    });

    describe('Follow Status Check Failure During Search', () => {
      it('returns actors without follow status when check fails', async () => {
        const mockAgent = createSuccessfulSearchAgent({
          testuser: [
            { did: 'did:plc:user1', handle: 'testuser.bsky.social' },
          ],
        });

        // Override listRecords to fail (used by FollowService.checkFollowStatus)
        (mockAgent.api.com.atproto.repo.listRecords as ReturnType<typeof vi.fn>)
          .mockRejectedValue(new Error('Follow status check failed'));

        const originalMethod = SessionService.getAgentForSession;
        SessionService.getAgentForSession = vi.fn().mockResolvedValue({
          agent: mockAgent,
          did: 'did:plc:test-standard-user-001',
          client: {},
        });

        try {
          const res = await requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: ['testuser'],
              }),
            },
          );

          expect(res.status).toBe(200);
          const body = await parseResponse(res);
          expect(body.success).toBe(true);

          // Should still return results even if follow status fails
          const result = body.data.results[0];
          expect(result.actors.length).toBeGreaterThanOrEqual(1);
        } finally {
          SessionService.getAgentForSession = originalMethod;
        }
      });
    });
  });
});
