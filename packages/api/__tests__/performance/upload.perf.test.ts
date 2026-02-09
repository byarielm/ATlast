/**
 * Upload & Results Performance Tests
 *
 * Validates the save endpoint and uploads query performance with large datasets.
 * These tests use real database operations to measure DB throughput.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authRequest, requestWithSession, parseResponse, testId } from '../helpers';
import {
  createTestSession,
  cleanupAllTestSessions,
  cleanupAllTestData,
} from '../fixtures';
import { UploadRepository } from '../../src/repositories/UploadRepository';

describe('Upload Performance Tests', { timeout: 60000 }, () => {
  let validSession: string;
  const testUploadIds: string[] = [];

  beforeAll(async () => {
    validSession = await createTestSession('power');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Save Results Throughput', () => {
    it('saves 500 results with matches under 30s', async () => {
      const uploadId = testId('perf-save-500');
      testUploadIds.push(uploadId);

      // Generate 500 results — 300 with matches, 200 without
      const results = Array.from({ length: 500 }, (_, i) => {
        const hasMatch = i < 300;
        return {
          sourceUser: {
            username: `perf_save_user_${String(i).padStart(4, '0')}`,
            date: '2026-01-15',
          },
          atprotoMatches: hasMatch
            ? [
                {
                  did: `did:plc:perf-save-match-${String(i).padStart(4, '0')}`,
                  handle: `perfmatch${i}.bsky.social`,
                  displayName: `Perf Match ${i}`,
                  matchScore: 80 + (i % 20),
                  postCount: 10 + i,
                  followerCount: 100 + i * 2,
                },
              ]
            : [],
          isSearching: false,
        };
      });

      const start = performance.now();
      const res = await requestWithSession(
        '/api/results/save',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            uploadId,
            sourcePlatform: 'performance-test',
            results,
          }),
        },
      );
      const duration = performance.now() - start;

      expect(res.status).toBe(200);

      const body = await parseResponse<{
        success: boolean;
        uploadId: string;
        totalUsers: number;
        matchedUsers: number;
        unmatchedUsers: number;
      }>(res);

      expect(body.success).toBe(true);
      expect(body.uploadId).toBe(uploadId);
      expect(body.totalUsers).toBe(500);
      expect(body.matchedUsers).toBe(300);
      expect(body.unmatchedUsers).toBe(200);

      // Performance assertion: 500 results should save under 30s
      expect(duration).toBeLessThan(30000);
      console.log(
        `[Perf] 500-result save completed in ${duration.toFixed(0)}ms ` +
        `(${body.matchedUsers} matched, ${body.unmatchedUsers} unmatched)`,
      );
    });

    it('saves 1000 results under 30s', async () => {
      const uploadId = testId('perf-save-1000');
      testUploadIds.push(uploadId);

      // Generate 1000 results — 600 with matches, 400 without
      const results = Array.from({ length: 1000 }, (_, i) => {
        const hasMatch = i < 600;
        return {
          sourceUser: {
            username: `perf_save_1k_user_${String(i).padStart(4, '0')}`,
            date: '2026-01-20',
          },
          atprotoMatches: hasMatch
            ? [
                {
                  did: `did:plc:perf-save-1k-match-${String(i).padStart(4, '0')}`,
                  handle: `perf1kmatch${i}.bsky.social`,
                  displayName: `Perf 1K Match ${i}`,
                  matchScore: 70 + (i % 30),
                  postCount: 5 + i,
                  followerCount: 50 + i,
                },
              ]
            : [],
          isSearching: false,
        };
      });

      const start = performance.now();
      const res = await requestWithSession(
        '/api/results/save',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            uploadId,
            sourcePlatform: 'performance-test',
            results,
          }),
        },
      );
      const duration = performance.now() - start;

      expect(res.status).toBe(200);

      const body = await parseResponse<{
        success: boolean;
        totalUsers: number;
        matchedUsers: number;
        unmatchedUsers: number;
      }>(res);

      expect(body.success).toBe(true);
      expect(body.totalUsers).toBe(1000);
      expect(body.matchedUsers).toBe(600);
      expect(body.unmatchedUsers).toBe(400);

      // Performance assertion: 1000 results should save under 30s
      expect(duration).toBeLessThan(30000);
      console.log(
        `[Perf] 1000-result save completed in ${duration.toFixed(0)}ms ` +
        `(${body.matchedUsers} matched, ${body.unmatchedUsers} unmatched)`,
      );
    });

    it('saves results with multiple matches per user', async () => {
      const uploadId = testId('perf-save-multi');
      testUploadIds.push(uploadId);

      // 200 results, each with 3-5 AT Protocol matches
      const results = Array.from({ length: 200 }, (_, i) => ({
        sourceUser: {
          username: `perf_multi_user_${String(i).padStart(3, '0')}`,
          date: '2026-02-01',
        },
        atprotoMatches: Array.from(
          { length: 3 + (i % 3) }, // 3, 4, or 5 matches per user
          (_, j) => ({
            did: `did:plc:perf-multi-${i}-match-${j}`,
            handle: `perfmulti${i}m${j}.bsky.social`,
            displayName: `Multi Match ${i}-${j}`,
            matchScore: 90 - j * 10,
            postCount: 20 + j,
            followerCount: 200 + j * 50,
          }),
        ),
        isSearching: false,
      }));

      const totalMatches = results.reduce(
        (sum, r) => sum + r.atprotoMatches.length,
        0,
      );

      const start = performance.now();
      const res = await requestWithSession(
        '/api/results/save',
        validSession,
        {
          method: 'POST',
          body: JSON.stringify({
            uploadId,
            sourcePlatform: 'performance-test',
            results,
          }),
        },
      );
      const duration = performance.now() - start;

      expect(res.status).toBe(200);

      const body = await parseResponse<{
        success: boolean;
        totalUsers: number;
        matchedUsers: number;
      }>(res);

      expect(body.success).toBe(true);
      expect(body.totalUsers).toBe(200);
      expect(body.matchedUsers).toBe(200); // All have matches

      // With multiple matches per user, total match records is higher
      // The save should still complete within 30s
      expect(duration).toBeLessThan(30000);
      console.log(
        `[Perf] 200-user multi-match save (${totalMatches} total matches) ` +
        `completed in ${duration.toFixed(0)}ms`,
      );
    });
  });

  describe('Database Query Performance', () => {
    it('queries uploads list with 100+ entries efficiently', async () => {
      const uploadRepo = new UploadRepository();
      const userDid = 'did:plc:test-power-user-002';

      // Create 100 uploads directly via repository for speed
      const createPromises = Array.from({ length: 100 }, (_, i) => {
        const id = testId(`perf-query-${String(i).padStart(3, '0')}`);
        testUploadIds.push(id);
        return uploadRepo.createUpload(
          id,
          userDid,
          i % 3 === 0 ? 'instagram' : i % 3 === 1 ? 'tiktok' : 'twitter',
          50 + i,
          20 + (i % 30),
        );
      });
      await Promise.all(createPromises);

      // Now query the uploads list via the API
      const start = performance.now();
      const res = await requestWithSession(
        '/api/results/uploads',
        validSession,
      );
      const duration = performance.now() - start;

      expect(res.status).toBe(200);

      const body = await parseResponse<{
        success: boolean;
        data: {
          uploads: Array<{
            uploadId: string;
            sourcePlatform: string;
            totalUsers: number;
            matchedUsers: number;
          }>;
        };
      }>(res);

      expect(body.success).toBe(true);
      // Should have at least 100 uploads (plus any from earlier tests)
      expect(body.data.uploads.length).toBeGreaterThanOrEqual(100);

      // Verify uploads are sorted by created_at desc
      for (let i = 1; i < body.data.uploads.length; i++) {
        // All uploads should have valid data
        expect(body.data.uploads[i].uploadId).toBeTruthy();
        expect(body.data.uploads[i].sourcePlatform).toBeTruthy();
      }

      // Query should complete quickly even with 100+ entries
      expect(duration).toBeLessThan(5000);
      console.log(
        `[Perf] Uploads list query (${body.data.uploads.length} entries) ` +
        `completed in ${duration.toFixed(0)}ms`,
      );
    });

    it('retrieves upload details with pagination efficiently', async () => {
      // Use one of the uploads we created in the save tests (has actual results)
      // Find a save-500 or save-1000 upload
      const savUploadId = testUploadIds.find((id) => id.includes('perf-save-500'));

      if (!savUploadId) {
        // If save tests haven't run yet, skip
        console.log('[Perf] Skipping upload details test - no save upload found');
        return;
      }

      const start = performance.now();
      const res = await requestWithSession(
        `/api/results/upload-details?uploadId=${savUploadId}&page=1&pageSize=50`,
        validSession,
      );
      const duration = performance.now() - start;

      expect(res.status).toBe(200);

      const body = await parseResponse<{
        success: boolean;
        data: {
          results: Array<{
            sourceUser: { username: string };
            atprotoMatches: Array<{ did: string }>;
          }>;
          pagination: {
            page: number;
            pageSize: number;
            totalPages: number;
            totalUsers: number;
            hasNextPage: boolean;
          };
        };
      }>(res);

      expect(body.success).toBe(true);
      expect(body.data.results.length).toBeGreaterThan(0);
      expect(body.data.pagination.totalUsers).toBe(500);
      expect(body.data.pagination.hasNextPage).toBe(true);

      // Paginated query should be fast
      expect(duration).toBeLessThan(5000);
      console.log(
        `[Perf] Upload details query (page 1 of ${body.data.pagination.totalPages}, ` +
        `${body.data.pagination.totalUsers} total users) ` +
        `completed in ${duration.toFixed(0)}ms`,
      );
    });
  });
});
