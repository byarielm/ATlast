/**
 * Results API Contract Tests
 *
 * Validates that results endpoint responses match expected Zod schemas.
 * - POST /api/results/save
 * - GET /api/results/uploads
 * - GET /api/results/upload-details
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authRequest, parseResponse, testId, request } from '../helpers';
import {
  SaveResultsSuccessSchema,
  UploadsListSuccessSchema,
  UploadEntrySchema,
  UploadDetailsSuccessSchema,
  PaginationSchema,
} from '../../src/types/schemas';

describe('Results API Contract', () => {
  let savedUploadId: string;

  // ========================================================================
  // POST /api/results/save
  // ========================================================================

  describe('POST /api/results/save', () => {
    it('success response matches SaveResultsSuccessSchema', async () => {
      savedUploadId = testId('contract');
      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: savedUploadId,
          sourcePlatform: 'instagram',
          results: [
            {
              sourceUser: { username: 'contractuser1' },
              atprotoMatches: [
                {
                  did: 'did:plc:contract1',
                  handle: 'contractuser1.bsky.social',
                  displayName: 'Contract User',
                  matchScore: 100,
                  postCount: 10,
                  followerCount: 50,
                },
              ],
            },
            {
              sourceUser: { username: 'contractuser2' },
              atprotoMatches: [],
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = SaveResultsSuccessSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('save response counts are consistent', async () => {
      const uploadId = testId('contract-counts');
      const results = [
        {
          sourceUser: { username: 'user1' },
          atprotoMatches: [
            {
              did: 'did:plc:c1',
              handle: 'u1.bsky.social',
              matchScore: 80,
              postCount: 5,
              followerCount: 20,
            },
          ],
        },
        {
          sourceUser: { username: 'user2' },
          atprotoMatches: [],
        },
        {
          sourceUser: { username: 'user3' },
          atprotoMatches: [],
        },
      ];

      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'tiktok',
          results,
        }),
      });

      const body = await parseResponse<{
        totalUsers: number;
        matchedUsers: number;
        unmatchedUsers: number;
      }>(res);

      expect(body.totalUsers).toBe(3);
      expect(body.matchedUsers).toBe(1);
      expect(body.unmatchedUsers).toBe(2);
      expect(body.matchedUsers + body.unmatchedUsers).toBe(body.totalUsers);
    });

    it('save with storage disabled includes message field', async () => {
      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: testId('no-save'),
          sourcePlatform: 'twitter',
          results: [
            {
              sourceUser: { username: 'nosave' },
              atprotoMatches: [],
            },
          ],
          saveData: false,
        }),
      });

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = SaveResultsSuccessSchema.safeParse(body);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBeDefined();
      }
    });

    it('success response has no unexpected top-level keys', async () => {
      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: testId('keys-check'),
          sourcePlatform: 'instagram',
          results: [],
        }),
      });

      const body = await parseResponse<Record<string, unknown>>(res);
      const expectedKeys = [
        'success',
        'uploadId',
        'totalUsers',
        'matchedUsers',
        'unmatchedUsers',
        'message',
      ];
      const unexpectedKeys = Object.keys(body).filter(
        (k) => !expectedKeys.includes(k),
      );
      expect(unexpectedKeys).toEqual([]);
    });

    it('unauthenticated save returns 401', async () => {
      const res = await request('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: 'x',
          sourcePlatform: 'x',
          results: [],
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  // ========================================================================
  // GET /api/results/uploads
  // ========================================================================

  describe('GET /api/results/uploads', () => {
    it('success response matches UploadsListSuccessSchema', async () => {
      const res = await authRequest('/api/results/uploads');

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = UploadsListSuccessSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('each upload entry matches UploadEntrySchema', async () => {
      const res = await authRequest('/api/results/uploads');
      const body = await parseResponse<{
        data: { uploads: Array<Record<string, unknown>> };
      }>(res);

      for (const upload of body.data.uploads) {
        const result = UploadEntrySchema.safeParse(upload);
        if (!result.success) {
          console.error(
            `Upload "${upload.uploadId}" failed validation:`,
            result.error.issues,
          );
        }
        expect(result.success).toBe(true);
      }
    });

    it('success response has no unexpected top-level keys', async () => {
      const res = await authRequest('/api/results/uploads');
      const body = await parseResponse<Record<string, unknown>>(res);

      const expectedKeys = ['success', 'data'];
      const unexpectedKeys = Object.keys(body).filter(
        (k) => !expectedKeys.includes(k),
      );
      expect(unexpectedKeys).toEqual([]);
    });

    it('unauthenticated request returns 401', async () => {
      const res = await request('/api/results/uploads');
      expect(res.status).toBe(401);
    });
  });

  // ========================================================================
  // GET /api/results/upload-details
  // ========================================================================

  describe('GET /api/results/upload-details', () => {
    it('success response matches UploadDetailsSuccessSchema', async () => {
      // Use the upload we created earlier
      const res = await authRequest(
        `/api/results/upload-details?uploadId=${savedUploadId}&page=1&pageSize=50`,
      );

      expect(res.status).toBe(200);
      const body = await parseResponse(res);
      const result = UploadDetailsSuccessSchema.safeParse(body);

      if (!result.success) {
        console.error('Schema validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('pagination matches PaginationSchema', async () => {
      const res = await authRequest(
        `/api/results/upload-details?uploadId=${savedUploadId}&page=1&pageSize=10`,
      );

      const body = await parseResponse<{
        data: { pagination: Record<string, unknown> };
      }>(res);
      const result = PaginationSchema.safeParse(body.data.pagination);

      if (!result.success) {
        console.error('Pagination validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('pagination values are self-consistent', async () => {
      const res = await authRequest(
        `/api/results/upload-details?uploadId=${savedUploadId}&page=1&pageSize=10`,
      );

      const body = await parseResponse<{
        data: {
          pagination: {
            page: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
          };
        };
      }>(res);

      const p = body.data.pagination;
      expect(p.hasPrevPage).toBe(p.page > 1);
      expect(p.hasNextPage).toBe(p.page < p.totalPages);
    });

    it('success response has no unexpected top-level keys', async () => {
      const res = await authRequest(
        `/api/results/upload-details?uploadId=${savedUploadId}&page=1`,
      );

      const body = await parseResponse<Record<string, unknown>>(res);
      const expectedKeys = ['success', 'data'];
      const unexpectedKeys = Object.keys(body).filter(
        (k) => !expectedKeys.includes(k),
      );
      expect(unexpectedKeys).toEqual([]);
    });
  });
});
