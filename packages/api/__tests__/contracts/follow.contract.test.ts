/**
 * Follow API Contract Tests
 *
 * Validates that follow endpoint responses match expected Zod schemas.
 * - POST /api/follow/batch-follow-users
 * - POST /api/follow/check-status
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authRequest, parseResponse, request } from '../helpers';
import {
  BatchFollowSuccessSchema,
  CheckStatusSuccessSchema,
  FollowErrorSchema,
  FollowResultEntrySchema,
} from '../../src/types/schemas';
import { SessionService } from '../../src/services/SessionService';
import { createFollowAgent } from '../fixtures/mockAgent';
import type { Agent } from '@atproto/api';

describe('Follow API Contract', () => {
  const originalGetAgent = SessionService.getAgentForSession;

  beforeAll(() => {
    const agent: Agent = createFollowAgent({
      alreadyFollowing: ['did:plc:already1'],
      failDids: ['did:plc:failme'],
    });

    SessionService.getAgentForSession = async () => ({
      agent,
      did: 'did:plc:test-contract-follow',
    });
  });

  afterAll(() => {
    SessionService.getAgentForSession = originalGetAgent;
  });

  // ========================================================================
  // batch-follow-users success contract
  // ========================================================================

  describe('POST /api/follow/batch-follow-users', () => {
    it('success response matches BatchFollowSuccessSchema', async () => {
      const res = await authRequest('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({
          dids: ['did:plc:new1', 'did:plc:already1', 'did:plc:failme'],
        }),
      });

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = BatchFollowSuccessSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('individual follow results match FollowResultEntrySchema', async () => {
      const res = await authRequest('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({ dids: ['did:plc:new1', 'did:plc:already1'] }),
      });

      const body = await parseResponse<{
        data: { results: Array<Record<string, unknown>> };
      }>(res);

      for (const entry of body.data.results) {
        const result = FollowResultEntrySchema.safeParse(entry);
        if (!result.success) {
          console.error(
            `Entry "${entry.did}" failed validation:`,
            result.error.issues,
          );
        }
        expect(result.success).toBe(true);
      }
    });

    it('data counts are consistent', async () => {
      const dids = ['did:plc:new1', 'did:plc:already1', 'did:plc:failme'];
      const res = await authRequest('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({ dids }),
      });

      const body = await parseResponse<{
        data: {
          total: number;
          succeeded: number;
          failed: number;
          results: Array<{ did: string }>;
        };
      }>(res);

      expect(body.data.total).toBe(dids.length);
      expect(body.data.succeeded + body.data.failed).toBe(dids.length);
      expect(body.data.results).toHaveLength(dids.length);
    });

    it('success response has no unexpected top-level keys', async () => {
      const res = await authRequest('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({ dids: ['did:plc:new1'] }),
      });

      const body = await parseResponse<Record<string, unknown>>(res);
      const expectedKeys = ['success', 'data'];
      const unexpectedKeys = Object.keys(body).filter(
        (k) => !expectedKeys.includes(k),
      );
      expect(unexpectedKeys).toEqual([]);
    });

    it('validation error matches ErrorResponseSchema', async () => {
      const res = await authRequest('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({ dids: [] }),
      });

      expect(res.status).toBe(400);
      const body = await parseResponse(res);
      const result = FollowErrorSchema.safeParse(body);
      expect(result.success).toBe(true);
    });

    it('non-did strings rejected with error response', async () => {
      const res = await authRequest('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({ dids: ['notadid'] }),
      });

      expect(res.status).toBe(400);
      const body = await parseResponse(res);
      const result = FollowErrorSchema.safeParse(body);
      expect(result.success).toBe(true);
    });

    it('unauthenticated request returns 401', async () => {
      const res = await request('/api/follow/batch-follow-users', {
        method: 'POST',
        body: JSON.stringify({ dids: ['did:plc:test'] }),
      });
      expect(res.status).toBe(401);
    });
  });

  // ========================================================================
  // check-status success contract
  // ========================================================================

  describe('POST /api/follow/check-status', () => {
    it('success response matches CheckStatusSuccessSchema', async () => {
      const res = await authRequest('/api/follow/check-status', {
        method: 'POST',
        body: JSON.stringify({ dids: ['did:plc:already1', 'did:plc:new1'] }),
      });

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = CheckStatusSuccessSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('followStatus keys are DID strings with boolean values', async () => {
      const res = await authRequest('/api/follow/check-status', {
        method: 'POST',
        body: JSON.stringify({ dids: ['did:plc:already1', 'did:plc:new1'] }),
      });

      const body = await parseResponse<{
        data: { followStatus: Record<string, boolean> };
      }>(res);

      for (const [key, value] of Object.entries(body.data.followStatus)) {
        expect(key).toMatch(/^did:/);
        expect(typeof value).toBe('boolean');
      }
    });

    it('success response has no unexpected top-level keys', async () => {
      const res = await authRequest('/api/follow/check-status', {
        method: 'POST',
        body: JSON.stringify({ dids: ['did:plc:test1'] }),
      });

      const body = await parseResponse<Record<string, unknown>>(res);
      const expectedKeys = ['success', 'data'];
      const unexpectedKeys = Object.keys(body).filter(
        (k) => !expectedKeys.includes(k),
      );
      expect(unexpectedKeys).toEqual([]);
    });

    it('validation error matches ErrorResponseSchema', async () => {
      const res = await authRequest('/api/follow/check-status', {
        method: 'POST',
        body: JSON.stringify({ dids: [] }),
      });

      expect(res.status).toBe(400);
      const body = await parseResponse(res);
      const result = FollowErrorSchema.safeParse(body);
      expect(result.success).toBe(true);
    });
  });
});
