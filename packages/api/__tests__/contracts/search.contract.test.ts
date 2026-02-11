/**
 * Search API Contract Tests
 *
 * Validates that POST /api/search/batch-search-actors responses
 * match the expected Zod schemas at runtime.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authRequest, parseResponse, request } from '../helpers';
import {
  BatchSearchSuccessSchema,
  BatchSearchErrorSchema,
  EnrichedActorSchema,
  SearchResultEntrySchema,
} from '../../src/types/schemas';
import { SessionService } from '../../src/services/SessionService';
import { createSuccessfulSearchAgent } from '../fixtures/mockAgent';
import type { Agent } from '@atproto/api';

describe('Search API Contract', () => {
  const originalGetAgent = SessionService.getAgentForSession;
  let mockAgent: Agent;

  beforeAll(() => {
    // Create a rich mock agent that returns actors with all fields populated
    mockAgent = createSuccessfulSearchAgent({
      testuser: [
        {
          did: 'did:plc:testuser123',
          handle: 'testuser.bsky.social',
          displayName: 'Test User',
          avatar: 'https://cdn.bsky.app/avatar.jpg',
          description: 'A test user profile',
        },
        {
          did: 'did:plc:testuser456',
          handle: 'testuser2.bsky.social',
          displayName: 'Another Testuser',
        },
      ],
    });

    SessionService.getAgentForSession = async () => ({
      agent: mockAgent,
      did: 'did:plc:test-contract',
    });
  });

  afterAll(() => {
    SessionService.getAgentForSession = originalGetAgent;
  });

  // ========================================================================
  // Success response contract
  // ========================================================================

  it('success response matches BatchSearchSuccessSchema', async () => {
    const res = await authRequest('/api/search/batch-search-actors', {
      method: 'POST',
      body: JSON.stringify({ usernames: ['testuser'] }),
    });

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    const result = BatchSearchSuccessSchema.safeParse(body);

    if (!result.success) {
      console.error('Schema validation errors:', result.error.issues);
    }
    expect(result.success).toBe(true);
  });

  it('result entries match SearchResultEntrySchema', async () => {
    const res = await authRequest('/api/search/batch-search-actors', {
      method: 'POST',
      body: JSON.stringify({ usernames: ['testuser'] }),
    });

    const body = await parseResponse<{
      data: { results: Array<Record<string, unknown>> };
    }>(res);

    for (const entry of body.data.results) {
      const result = SearchResultEntrySchema.safeParse(entry);
      if (!result.success) {
        console.error(
          `Entry "${entry.username}" failed validation:`,
          result.error.issues,
        );
      }
      expect(result.success).toBe(true);
    }
  });

  it('enriched actors match EnrichedActorSchema', async () => {
    const res = await authRequest('/api/search/batch-search-actors', {
      method: 'POST',
      body: JSON.stringify({ usernames: ['testuser'] }),
    });

    const body = await parseResponse<{
      data: { results: Array<{ actors: Array<Record<string, unknown>> }> };
    }>(res);

    const actors = body.data.results.flatMap((r) => r.actors);
    expect(actors.length).toBeGreaterThan(0);

    for (const actor of actors) {
      const result = EnrichedActorSchema.safeParse(actor);
      if (!result.success) {
        console.error(
          `Actor "${actor.handle}" failed validation:`,
          result.error.issues,
        );
      }
      expect(result.success).toBe(true);
    }
  });

  it('success response has no unexpected top-level keys', async () => {
    const res = await authRequest('/api/search/batch-search-actors', {
      method: 'POST',
      body: JSON.stringify({ usernames: ['testuser'] }),
    });

    const body = await parseResponse<Record<string, unknown>>(res);
    const expectedKeys = ['success', 'data'];
    const unexpectedKeys = Object.keys(body).filter(
      (k) => !expectedKeys.includes(k),
    );

    expect(unexpectedKeys).toEqual([]);
  });

  // ========================================================================
  // Multiple usernames
  // ========================================================================

  it('multi-username response preserves schema for all entries', async () => {
    const res = await authRequest('/api/search/batch-search-actors', {
      method: 'POST',
      body: JSON.stringify({ usernames: ['testuser', 'another', 'missing'] }),
    });

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    const result = BatchSearchSuccessSchema.safeParse(body);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.results).toHaveLength(3);
    }
  });

  // ========================================================================
  // Error response contract
  // ========================================================================

  it('validation error matches ErrorResponseSchema', async () => {
    const res = await authRequest('/api/search/batch-search-actors', {
      method: 'POST',
      body: JSON.stringify({ usernames: [] }),
    });

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    const result = BatchSearchErrorSchema.safeParse(body);

    expect(result.success).toBe(true);
  });

  it('missing body returns error matching ErrorResponseSchema', async () => {
    const res = await authRequest('/api/search/batch-search-actors', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    const result = BatchSearchErrorSchema.safeParse(body);

    expect(result.success).toBe(true);
  });

  it('unauthenticated request returns error response', async () => {
    const res = await request('/api/search/batch-search-actors', {
      method: 'POST',
      body: JSON.stringify({ usernames: ['test'] }),
    });

    expect(res.status).toBe(401);
  });
});
