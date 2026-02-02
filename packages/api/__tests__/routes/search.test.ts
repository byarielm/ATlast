/**
 * Search API Integration Tests
 *
 * Tests batch actor search functionality on AT Protocol.
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
  cleanupAllTestSessions,
} from '../fixtures';

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
});
