/**
 * Follow Performance Tests
 *
 * Validates batch follow endpoint performance using mock AT Protocol agents.
 * Tests the chunked concurrency model (5 parallel) and overall throughput.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { requestWithSession, parseResponse } from '../helpers';
import {
  createTestSession,
  cleanupAllTestSessions,
  createMockAgent,
  createFollowAgent,
} from '../fixtures';
import type { MockFollowRecord, MockProfile } from '../fixtures';
import { SessionService } from '../../src/services/SessionService';

describe('Follow Performance Tests', () => {
  let validSession: string;

  beforeAll(async () => {
    validSession = await createTestSession('power');
  });

  afterAll(async () => {
    await cleanupAllTestSessions();
  });

  describe('Batch Follow Throughput', () => {
    it('batch follow handles 100 DIDs under 10s', async () => {
      // Mock agent that succeeds on all follows
      const mockAgent = createFollowAgent();

      const originalMethod = SessionService.getAgentForSession;
      SessionService.getAgentForSession = vi.fn().mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-power-user-002',
        client: {},
      });

      try {
        const dids = Array.from(
          { length: 100 },
          (_, i) => `did:plc:perf-follow-target-${String(i).padStart(3, '0')}`,
        );

        const start = performance.now();
        const res = await requestWithSession(
          '/api/follow/batch-follow-users',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({ dids }),
          },
        );
        const duration = performance.now() - start;

        expect(res.status).toBe(200);

        const body = await parseResponse<{
          success: boolean;
          data: {
            total: number;
            succeeded: number;
            failed: number;
            alreadyFollowing: number;
            results: Array<{
              did: string;
              success: boolean;
              alreadyFollowing: boolean;
              error: string | null;
            }>;
          };
        }>(res);

        expect(body.success).toBe(true);
        expect(body.data.total).toBe(100);
        expect(body.data.succeeded).toBe(100);
        expect(body.data.failed).toBe(0);
        expect(body.data.results).toHaveLength(100);

        // All results should be successful
        for (const result of body.data.results) {
          expect(result.success).toBe(true);
          expect(result.error).toBeNull();
        }

        // Performance assertion: 100 follows should complete under 10s
        expect(duration).toBeLessThan(10000);
        console.log(
          `[Perf] 100-DID batch follow completed in ${duration.toFixed(0)}ms`,
        );
      } finally {
        SessionService.getAgentForSession = originalMethod;
      }
    });

    it('batch follow with mixed results maintains throughput', async () => {
      // Agent where some DIDs are already followed, some succeed, some fail
      const alreadyFollowing = Array.from(
        { length: 20 },
        (_, i) => `did:plc:perf-mixed-already-${i}`,
      );
      const failDids = Array.from(
        { length: 10 },
        (_, i) => `did:plc:perf-mixed-fail-${i}`,
      );

      const mockAgent = createFollowAgent({ alreadyFollowing, failDids });

      const originalMethod = SessionService.getAgentForSession;
      SessionService.getAgentForSession = vi.fn().mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-power-user-002',
        client: {},
      });

      try {
        // Mix of already-following, new follows, and failures
        const dids = [
          ...alreadyFollowing,
          ...failDids,
          ...Array.from(
            { length: 70 },
            (_, i) => `did:plc:perf-mixed-new-${i}`,
          ),
        ];

        const start = performance.now();
        const res = await requestWithSession(
          '/api/follow/batch-follow-users',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({ dids }),
          },
        );
        const duration = performance.now() - start;

        expect(res.status).toBe(200);

        const body = await parseResponse<{
          success: boolean;
          data: {
            total: number;
            succeeded: number;
            failed: number;
            alreadyFollowing: number;
            results: Array<{
              did: string;
              success: boolean;
              alreadyFollowing: boolean;
              error: string | null;
            }>;
          };
        }>(res);

        expect(body.success).toBe(true);
        expect(body.data.total).toBe(100);
        expect(body.data.succeeded).toBe(90); // 20 already + 70 new
        expect(body.data.failed).toBe(10);
        expect(body.data.alreadyFollowing).toBe(20);

        // Mixed results should still complete within 10s
        expect(duration).toBeLessThan(10000);
        console.log(
          `[Perf] 100-DID mixed batch follow completed in ${duration.toFixed(0)}ms ` +
          `(${body.data.alreadyFollowing} already, ${body.data.failed} failed, ` +
          `${body.data.succeeded - body.data.alreadyFollowing} new)`,
        );
      } finally {
        SessionService.getAgentForSession = originalMethod;
      }
    });

    it('chunked concurrency processes all chunks correctly', async () => {
      // Verify that the chunked concurrency model (5 parallel) processes all DIDs
      const processedDids: string[] = [];
      const mockAgent = createMockAgent({
        listRecords: async () => ({
          data: { records: [] as MockFollowRecord[], cursor: undefined },
        }),
        createRecord: async (params) => {
          const targetDid =
            (params.record as { subject?: string }).subject ?? '';
          processedDids.push(targetDid);
          return {
            uri: `at://did:plc:mock/app.bsky.graph.follow/${Date.now()}`,
            cid: 'mock-cid',
          };
        },
      });

      const originalMethod = SessionService.getAgentForSession;
      SessionService.getAgentForSession = vi.fn().mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-power-user-002',
        client: {},
      });

      try {
        // 100 DIDs = 20 chunks of 5
        const dids = Array.from(
          { length: 100 },
          (_, i) => `did:plc:chunk-test-${String(i).padStart(3, '0')}`,
        );

        const res = await requestWithSession(
          '/api/follow/batch-follow-users',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({ dids }),
          },
        );

        expect(res.status).toBe(200);

        const body = await parseResponse<{
          success: boolean;
          data: { total: number; succeeded: number };
        }>(res);

        expect(body.data.total).toBe(100);
        expect(body.data.succeeded).toBe(100);

        // All 100 DIDs should have been processed via createRecord
        expect(processedDids).toHaveLength(100);

        // Verify all original DIDs were processed (order may vary due to concurrency)
        const processedSet = new Set(processedDids);
        for (const did of dids) {
          expect(processedSet.has(did)).toBe(true);
        }
      } finally {
        SessionService.getAgentForSession = originalMethod;
      }
    });
  });

  describe('Check Follow Status Performance', () => {
    it('check-status handles 100 DIDs efficiently', async () => {
      // Create mock that simulates paginated listRecords
      const followedDids = Array.from(
        { length: 50 },
        (_, i) => `did:plc:perf-status-${i}`,
      );

      const mockAgent = createMockAgent({
        listRecords: async () => ({
          data: {
            records: followedDids.map((did): MockFollowRecord => ({
              uri: `at://did:plc:mock/app.bsky.graph.follow/${did}`,
              cid: 'mock-cid',
              value: { subject: did, createdAt: new Date().toISOString() },
            })),
            cursor: undefined,
          },
        }),
      });

      const originalMethod = SessionService.getAgentForSession;
      SessionService.getAgentForSession = vi.fn().mockResolvedValue({
        agent: mockAgent,
        did: 'did:plc:test-power-user-002',
        client: {},
      });

      try {
        const dids = Array.from(
          { length: 100 },
          (_, i) => `did:plc:perf-status-${i}`,
        );

        const start = performance.now();
        const res = await requestWithSession(
          '/api/follow/check-status',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({ dids }),
          },
        );
        const duration = performance.now() - start;

        expect(res.status).toBe(200);

        const body = await parseResponse<{
          success: boolean;
          data: { followStatus: Record<string, boolean> };
        }>(res);

        expect(body.success).toBe(true);
        expect(Object.keys(body.data.followStatus)).toHaveLength(100);

        // First 50 should be following, rest should not
        for (let i = 0; i < 50; i++) {
          expect(body.data.followStatus[`did:plc:perf-status-${i}`]).toBe(true);
        }
        for (let i = 50; i < 100; i++) {
          expect(body.data.followStatus[`did:plc:perf-status-${i}`]).toBe(false);
        }

        // Status check should complete quickly with mock agent
        expect(duration).toBeLessThan(5000);
        console.log(
          `[Perf] 100-DID follow status check completed in ${duration.toFixed(0)}ms`,
        );
      } finally {
        SessionService.getAgentForSession = originalMethod;
      }
    });
  });
});
