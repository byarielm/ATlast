/**
 * Search Performance Tests
 *
 * Validates search endpoint performance under load using mock AT Protocol agents.
 * These tests measure the processing overhead of our code (ranking, normalization,
 * profile enrichment, follow status checking) without real network calls.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  authRequest,
  requestWithSession,
  parseResponse,
  createFreshTestSession,
} from '../helpers';
import {
  createTestSession,
  cleanupAllTestSessions,
  createMockAgent,
} from '../fixtures';
import type { MockActor, MockProfile } from '../fixtures';
import { SessionService } from '../../src/services/SessionService';

describe('Search Performance Tests', () => {
  let validSession: string;

  beforeAll(async () => {
    validSession = await createTestSession('power');
  });

  afterAll(async () => {
    await cleanupAllTestSessions();
  });

  describe('Batch Search Throughput', () => {
    it('batch search handles 50 usernames under 5s', async () => {
      // Create a mock agent that returns multiple actors per search
      // to exercise the full ranking pipeline
      const mockAgent = createMockAgent({
        searchActors: async ({ q }: { q: string; limit: number }) => ({
          data: {
            actors: Array.from({ length: 10 }, (_, i): MockActor => ({
              did: `did:plc:perf-search-${q}-${i}`,
              handle: i === 0
                ? `${q}.bsky.social`
                : `${q}variant${i}.bsky.social`,
              displayName: i === 0 ? q : `${q} Similar ${i}`,
              avatar: `https://example.com/avatar/${q}/${i}.jpg`,
              description: `Test profile for performance testing - ${q}`,
            })),
          },
        }),
        getProfiles: async ({ actors }: { actors: string[] }) => ({
          data: {
            profiles: actors.map((did): MockProfile => ({
              did,
              handle: `${did.split(':').pop()}.bsky.social`,
              postsCount: Math.floor(Math.random() * 1000),
              followersCount: Math.floor(Math.random() * 5000),
            })),
          },
        }),
        listRecords: async () => ({
          data: { records: [], cursor: undefined },
        }),
      });

      const originalMethod = SessionService.getAgentForSession;
      SessionService.getAgentForSession = vi.fn().mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-power-user-002',
        client: {},
      });

      try {
        const usernames = Array.from({ length: 50 }, (_, i) => `perfuser${i}`);

        const start = performance.now();
        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({ usernames }),
          },
        );
        const duration = performance.now() - start;

        expect(res.status).toBe(200);

        const body = await parseResponse<{
          success: boolean;
          data: {
            results: Array<{
              username: string;
              actors: Array<{ did: string; matchScore: number }>;
              error: string | null;
            }>;
          };
        }>(res);

        expect(body.success).toBe(true);
        expect(body.data.results).toHaveLength(50);

        // Verify all results have actors (mock agent returns actors for every query)
        for (const result of body.data.results) {
          expect(result.error).toBeNull();
          expect(result.actors.length).toBeGreaterThan(0);
          // Actors should be sorted by matchScore descending
          for (let i = 1; i < result.actors.length; i++) {
            expect(result.actors[i - 1].matchScore).toBeGreaterThanOrEqual(
              result.actors[i].matchScore,
            );
          }
        }

        // Performance assertion: 50 searches should complete in under 5 seconds
        expect(duration).toBeLessThan(5000);
        console.log(
          `[Perf] 50-username batch search completed in ${duration.toFixed(0)}ms`,
        );
      } finally {
        SessionService.getAgentForSession = originalMethod;
      }
    });

    it('handles maximum batch size (50 usernames) with enrichment', async () => {
      // Test that profile enrichment and follow status don't add excessive overhead
      const mockAgent = createMockAgent({
        searchActors: async ({ q }: { q: string; limit: number }) => ({
          data: {
            actors: Array.from({ length: 5 }, (_, i): MockActor => ({
              did: `did:plc:enrich-${q}-${i}`,
              handle: `${q}match${i}.bsky.social`,
              displayName: `${q} Match ${i}`,
            })),
          },
        }),
        getProfiles: async ({ actors }: { actors: string[] }) => ({
          data: {
            profiles: actors.map((did): MockProfile => ({
              did,
              handle: `${did.split(':').pop()}.bsky.social`,
              postsCount: 42,
              followersCount: 100,
            })),
          },
        }),
        listRecords: async () => ({
          data: { records: [], cursor: undefined },
        }),
      });

      const originalMethod = SessionService.getAgentForSession;
      SessionService.getAgentForSession = vi.fn().mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-power-user-002',
        client: {},
      });

      try {
        const usernames = Array.from({ length: 50 }, (_, i) => `enrichuser${i}`);

        const start = performance.now();
        const res = await requestWithSession(
          '/api/search/batch-search-actors',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({ usernames }),
          },
        );
        const duration = performance.now() - start;

        expect(res.status).toBe(200);

        const body = await parseResponse<{
          success: boolean;
          data: {
            results: Array<{
              username: string;
              actors: Array<{
                postCount: number;
                followerCount: number;
                followStatus: Record<string, boolean>;
              }>;
              error: string | null;
            }>;
          };
        }>(res);

        // Verify enrichment was applied
        for (const result of body.data.results) {
          for (const actor of result.actors) {
            expect(actor).toHaveProperty('postCount');
            expect(actor).toHaveProperty('followerCount');
            expect(actor).toHaveProperty('followStatus');
          }
        }

        // Enriched search should still complete within 5s
        expect(duration).toBeLessThan(5000);
        console.log(
          `[Perf] 50-username enriched search completed in ${duration.toFixed(0)}ms`,
        );
      } finally {
        SessionService.getAgentForSession = originalMethod;
      }
    });
  });

  describe('Concurrent Sessions', () => {
    it('handles 10 concurrent search requests without degradation', async () => {
      const mockAgent = createMockAgent({
        searchActors: async ({ q }: { q: string; limit: number }) => ({
          data: {
            actors: [
              {
                did: `did:plc:concurrent-${q}`,
                handle: `${q}.bsky.social`,
                displayName: q,
              },
            ],
          },
        }),
        getProfiles: async ({ actors }: { actors: string[] }) => ({
          data: {
            profiles: actors.map((did): MockProfile => ({
              did,
              handle: `${did.split(':').pop()}.bsky.social`,
              postsCount: 10,
              followersCount: 50,
            })),
          },
        }),
        listRecords: async () => ({
          data: { records: [], cursor: undefined },
        }),
      });

      const originalMethod = SessionService.getAgentForSession;
      SessionService.getAgentForSession = vi.fn().mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-power-user-002',
        client: {},
      });

      try {
        // Create 10 concurrent search requests
        const requests = Array.from({ length: 10 }, (_, i) =>
          requestWithSession(
            '/api/search/batch-search-actors',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: [`concurrent_user_${i}_a`, `concurrent_user_${i}_b`],
              }),
            },
          ),
        );

        const start = performance.now();
        const results = await Promise.all(requests);
        const duration = performance.now() - start;

        // All requests should succeed
        for (const res of results) {
          expect(res.status).toBe(200);
        }

        // Verify each response has correct data
        for (const res of results) {
          const body = await parseResponse<{
            success: boolean;
            data: { results: Array<{ username: string }> };
          }>(res);
          expect(body.success).toBe(true);
          expect(body.data.results).toHaveLength(2);
        }

        // 10 concurrent requests should complete within 10s
        expect(duration).toBeLessThan(10000);
        console.log(
          `[Perf] 10 concurrent search requests completed in ${duration.toFixed(0)}ms`,
        );
      } finally {
        SessionService.getAgentForSession = originalMethod;
      }
    });

    it('handles concurrent requests from different sessions', async () => {
      const mockAgent = createMockAgent({
        searchActors: async ({ q }: { q: string; limit: number }) => ({
          data: {
            actors: [
              {
                did: `did:plc:multi-session-${q}`,
                handle: `${q}.bsky.social`,
                displayName: q,
              },
            ],
          },
        }),
        getProfiles: async ({ actors }: { actors: string[] }) => ({
          data: {
            profiles: actors.map((did): MockProfile => ({
              did,
              handle: `${did.split(':').pop()}.bsky.social`,
              postsCount: 5,
              followersCount: 25,
            })),
          },
        }),
        listRecords: async () => ({
          data: { records: [], cursor: undefined },
        }),
      });

      const originalMethod = SessionService.getAgentForSession;
      SessionService.getAgentForSession = vi.fn().mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-power-user-002',
        client: {},
      });

      try {
        // Create multiple sessions (reuse same user, different session IDs)
        const sessions = await Promise.all([
          createFreshTestSession('power'),
          createFreshTestSession('standard'),
          createFreshTestSession('new'),
        ]);

        // Fire concurrent requests from different sessions
        const requests = sessions.map((session, i) =>
          requestWithSession(
            '/api/search/batch-search-actors',
            session,
            {
              method: 'POST',
              body: JSON.stringify({
                usernames: [`session${i}_user1`, `session${i}_user2`],
              }),
            },
          ),
        );

        const start = performance.now();
        const results = await Promise.all(requests);
        const duration = performance.now() - start;

        // All should succeed
        for (const res of results) {
          expect(res.status).toBe(200);
        }

        expect(duration).toBeLessThan(5000);
        console.log(
          `[Perf] 3 multi-session concurrent requests completed in ${duration.toFixed(0)}ms`,
        );
      } finally {
        SessionService.getAgentForSession = originalMethod;
      }
    });
  });
});
