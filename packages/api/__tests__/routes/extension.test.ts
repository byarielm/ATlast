/**
 * Extension API Integration Tests
 *
 * Tests browser extension import functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  request,
  authRequest,
  requestWithSession,
  parseResponse,
  testId,
} from '../helpers';
import {
  createTestSession,
  cleanupAllTestSessions,
} from '../fixtures';

describe('Extension API', () => {
  let validSession: string;

  beforeAll(async () => {
    validSession = await createTestSession('standard');
  });

  afterAll(async () => {
    await cleanupAllTestSessions();
  });

  describe('POST /api/extension/import', () => {
    it('returns 401 without authentication', async () => {
      const res = await request('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'instagram',
          usernames: ['testuser'],
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://instagram.com/testuser/following',
          },
        }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 with missing platform', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          usernames: ['testuser'],
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://instagram.com/testuser/following',
          },
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid request');
    });

    it('returns 400 with empty usernames array', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'instagram',
          usernames: [],
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://instagram.com/testuser/following',
          },
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid request');
    });

    it('returns 400 with too many usernames (>10000)', async () => {
      const tooManyUsernames = Array.from({ length: 10001 }, (_, i) => `user${i}`);

      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'instagram',
          usernames: tooManyUsernames,
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'https://instagram.com/testuser/following',
          },
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
      expect(body.error).toContain('1-10000');
    });

    it('returns 400 with missing metadata', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'instagram',
          usernames: ['testuser'],
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
    });

    it('returns 400 with invalid metadata.pageType', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'instagram',
          usernames: ['testuser'],
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'invalid',
            sourceUrl: 'https://instagram.com/testuser/following',
          },
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
    });

    it('returns 400 with invalid sourceUrl', async () => {
      const res = await authRequest('/api/extension/import', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'instagram',
          usernames: ['testuser'],
          metadata: {
            extensionVersion: '1.0.0',
            scrapedAt: new Date().toISOString(),
            pageType: 'following',
            sourceUrl: 'not-a-url',
          },
        }),
      });
      expect(res.status).toBe(400);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
    });

    it('accepts valid request with single username', async () => {
      const res = await requestWithSession(
        '/api/extension/import',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'instagram',
            usernames: ['testuser'],
            metadata: {
              extensionVersion: '1.0.0',
              scrapedAt: new Date().toISOString(),
              pageType: 'following',
              sourceUrl: 'https://instagram.com/testuser/following',
            },
          }),
        },
      );

      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('importId');
      expect(body.data).toHaveProperty('usernameCount');
      expect(body.data).toHaveProperty('redirectUrl');
      expect(body.data.usernameCount).toBe(1);
    });

    it('accepts valid request with multiple usernames', async () => {
      const usernames = ['user1', 'user2', 'user3', 'user4', 'user5'];

      const res = await requestWithSession(
        '/api/extension/import',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'tiktok',
            usernames,
            metadata: {
              extensionVersion: '1.0.0',
              scrapedAt: new Date().toISOString(),
              pageType: 'following',
              sourceUrl: 'https://tiktok.com/@testuser/following',
            },
          }),
        },
      );

      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data.usernameCount).toBe(5);
      expect(body.data.importId).toBeTruthy();
      expect(body.data.redirectUrl).toContain(body.data.importId);
    });

    it('accepts all valid pageTypes', async () => {
      const pageTypes = ['following', 'followers', 'list'] as const;

      for (const pageType of pageTypes) {
        const res = await requestWithSession(
          '/api/extension/import',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              platform: 'twitter',
              usernames: ['testuser'],
              metadata: {
                extensionVersion: '1.0.0',
                scrapedAt: new Date().toISOString(),
                pageType,
                sourceUrl: `https://twitter.com/testuser/${pageType}`,
              },
            }),
          },
        );

        expect(res.status).toBe(200);

        const body = await parseResponse(res);
        expect(body.success).toBe(true);
      }
    });

    it('handles large username arrays (within limit)', async () => {
      const largeUsernameArray = Array.from({ length: 1000 }, (_, i) => `user${i}`);

      const res = await requestWithSession(
        '/api/extension/import',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'instagram',
            usernames: largeUsernameArray,
            metadata: {
              extensionVersion: '1.0.0',
              scrapedAt: new Date().toISOString(),
              pageType: 'following',
              sourceUrl: 'https://instagram.com/testuser/following',
            },
          }),
        },
      );

      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data.usernameCount).toBe(1000);
    });

    describe('Response Structure', () => {
      it('returns properly structured import response', async () => {
        const res = await requestWithSession(
          '/api/extension/import',
          validSession,
          {
            method: 'POST',
            body: JSON.stringify({
              platform: 'instagram',
              usernames: ['testuser1', 'testuser2'],
              metadata: {
                extensionVersion: '1.0.0',
                scrapedAt: new Date().toISOString(),
                pageType: 'following',
                sourceUrl: 'https://instagram.com/testuser/following',
              },
            }),
          },
        );

        expect(res.status).toBe(200);

        const body = await parseResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();

        // Verify importId is a hex string
        expect(body.data.importId).toMatch(/^[a-f0-9]{32}$/);

        // Verify usernameCount matches input
        expect(body.data.usernameCount).toBe(2);

        // Verify redirectUrl contains importId
        expect(body.data.redirectUrl).toContain(body.data.importId);
        expect(body.data.redirectUrl).toMatch(/\?uploadId=/);
      });
    });

    describe('Platform Support', () => {
      const platforms = [
        { name: 'instagram', url: 'https://instagram.com/user/following' },
        { name: 'tiktok', url: 'https://tiktok.com/@user/following' },
        { name: 'twitter', url: 'https://twitter.com/user/following' },
      ];

      platforms.forEach(({ name, url }) => {
        it(`accepts ${name} platform`, async () => {
          const res = await requestWithSession(
            '/api/extension/import',
            validSession,
            {
              method: 'POST',
              body: JSON.stringify({
                platform: name,
                usernames: ['testuser'],
                metadata: {
                  extensionVersion: '1.0.0',
                  scrapedAt: new Date().toISOString(),
                  pageType: 'following',
                  sourceUrl: url,
                },
              }),
            },
          );

          expect(res.status).toBe(200);

          const body = await parseResponse(res);
          expect(body.success).toBe(true);
        });
      });
    });
  });
});
