/**
 * Results API Integration Tests
 *
 * Two test modes:
 *   1. Seeded sessions (default) - Uses synthetic test users, no real auth needed
 *   2. Real auth sessions - Uses your actual Bluesky account
 *
 * Run seeded tests only:
 *   pnpm test
 *
 * Run with real auth (includes real user tests):
 *   1. pnpm test:login (get a session)
 *   2. set TEST_SESSION=<session-id> && pnpm test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  authRequest,
  realAuthRequest,
  hasRealTestSession,
  REAL_TEST_SESSION,
  request,
  requestWithSession,
  parseResponse,
  testId,
} from '../helpers';
import {
  createTestSession,
  createExpiredTestSession,
  cleanupAllTestData,
  TEST_USERS,
} from '../fixtures';

describe('Results API', () => {
  // Session IDs created for this test suite
  let standardSession: string;

  beforeAll(async () => {
    // Create a fresh session for these tests
    standardSession = await createTestSession('standard');
  });

  afterAll(async () => {
    // Clean up test data created during tests
    await cleanupAllTestData();
  });

  describe('GET /api/results/uploads', () => {
    it('returns 401 without authentication', async () => {
      const res = await request('/api/results/uploads');
      expect(res.status).toBe(401);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
    });

    it('returns uploads list with valid session', async () => {
      const res = await authRequest('/api/results/uploads');
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('uploads');
      expect(Array.isArray(body.data.uploads)).toBe(true);

      // Each upload should have expected fields
      if (body.data.uploads.length > 0) {
        const upload = body.data.uploads[0];
        expect(upload).toHaveProperty('uploadId');
        expect(upload).toHaveProperty('sourcePlatform');
        expect(upload).toHaveProperty('createdAt');
        expect(upload).toHaveProperty('totalUsers');
        expect(upload).toHaveProperty('matchedUsers');
        expect(upload).toHaveProperty('unmatchedUsers');
      }
    });

    it('returns 401 with expired session', async () => {
      const expiredSession = await createExpiredTestSession();
      const res = await requestWithSession('/api/results/uploads', expiredSession);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/results/save', () => {
    it('returns 401 without authentication', async () => {
      const res = await request('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: 'test',
          sourcePlatform: 'instagram',
          results: [],
        }),
      });
      expect(res.status).toBe(401);
    });

    it('saves results with matches', async () => {
      const uploadId = testId('upload');

      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'instagram',
          saveData: true,
          results: [
            {
              sourceUser: {
                username: 'testuser1',
                date: '2024-01-01',
              },
              atprotoMatches: [
                {
                  did: 'did:plc:test123',
                  handle: 'testuser.bsky.social',
                  displayName: 'Test User',
                  matchScore: 100,
                  postCount: 50,
                  followerCount: 200,
                },
              ],
            },
            {
              sourceUser: {
                username: 'testuser2',
                date: '2024-01-02',
              },
              atprotoMatches: [],
            },
          ],
        }),
      });

      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.uploadId).toBe(uploadId);
      expect(body.totalUsers).toBe(2);
      expect(body.matchedUsers).toBe(1);
      expect(body.unmatchedUsers).toBe(1);
    });

    it('respects saveData=false flag', async () => {
      const uploadId = testId('nosave');

      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'twitter',
          saveData: false,
          results: [
            {
              sourceUser: { username: 'tempuser', date: '' },
              atprotoMatches: [],
            },
          ],
        }),
      });

      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Data storage disabled');

      // Verify it wasn't actually saved
      const uploadsRes = await authRequest('/api/results/uploads');
      const uploadsBody = await parseResponse(uploadsRes);
      const found = uploadsBody.data.uploads.find(
        (u: { uploadId: string }) => u.uploadId === uploadId,
      );
      expect(found).toBeUndefined();
    });

    it('handles empty results array', async () => {
      const uploadId = testId('empty');

      const res = await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'tiktok',
          results: [],
        }),
      });

      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.totalUsers).toBe(0);
    });

    it('isolates data between test users', async () => {
      // Create upload as standard user
      const uploadId = testId('isolation');
      await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'instagram',
          saveData: true,
          results: [{ sourceUser: { username: 'isolationtest', date: '' }, atprotoMatches: [] }],
        }),
      });

      // Verify standard user can see it
      const standardRes = await authRequest('/api/results/uploads');
      const standardBody = await parseResponse(standardRes);
      const foundByStandard = standardBody.data.uploads.some(
        (u: { uploadId: string }) => u.uploadId === uploadId,
      );
      expect(foundByStandard).toBe(true);

      // Verify new user cannot see it
      const newUserRes = await authRequest('/api/results/uploads', {}, 'new');
      const newUserBody = await parseResponse(newUserRes);
      const foundByNewUser = newUserBody.data.uploads.some(
        (u: { uploadId: string }) => u.uploadId === uploadId,
      );
      expect(foundByNewUser).toBe(false);
    });
  });

  describe('GET /api/results/upload-details', () => {
    it('returns 401 without authentication', async () => {
      const res = await request('/api/results/upload-details?uploadId=test');
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent upload', async () => {
      const res = await authRequest(
        '/api/results/upload-details?uploadId=non-existent-id&page=1',
      );
      expect(res.status).toBe(404);

      const body = await parseResponse(res);
      expect(body.success).toBe(false);
    });

    it('returns paginated results for valid upload', async () => {
      // First, create an upload with data
      const uploadId = testId('details');

      await authRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'instagram',
          results: [
            {
              sourceUser: { username: 'detailsuser1', date: '2024-01-01' },
              atprotoMatches: [
                {
                  did: 'did:plc:details1',
                  handle: 'details1.bsky.social',
                  displayName: 'Details User 1',
                  matchScore: 95,
                  postCount: 100,
                  followerCount: 500,
                },
              ],
            },
            {
              sourceUser: { username: 'detailsuser2', date: '2024-01-02' },
              atprotoMatches: [],
            },
          ],
        }),
      });

      // Now fetch the details
      const res = await authRequest(
        `/api/results/upload-details?uploadId=${uploadId}&page=1&pageSize=50`,
      );
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('results');
      expect(body.data).toHaveProperty('pagination');

      // Check pagination structure
      const { pagination } = body.data;
      expect(pagination).toHaveProperty('page', 1);
      expect(pagination).toHaveProperty('pageSize', 50);
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('totalUsers', 2);
      expect(pagination).toHaveProperty('hasNextPage');
      expect(pagination).toHaveProperty('hasPrevPage', false);

      // Check results structure
      expect(body.data.results.length).toBeGreaterThan(0);
      const result = body.data.results[0];
      expect(result).toHaveProperty('sourceUser');
      expect(result.sourceUser).toHaveProperty('username');
      expect(result).toHaveProperty('atprotoMatches');
    });

    it('validates page parameters', async () => {
      // Test with invalid page
      const res = await authRequest(
        '/api/results/upload-details?uploadId=test&page=0',
      );
      expect(res.status).toBe(400);
    });
  });
});

describe('Health Check', () => {
  it('returns healthy status', async () => {
    const res = await request('/api/health');
    expect(res.status).toBe(200);

    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.database.status).toBe('connected');
  });
});

describe('Session Edge Cases', () => {
  it('handles requests with expired session', async () => {
    const expiredSession = await createExpiredTestSession();
    const res = await requestWithSession('/api/results/uploads', expiredSession);
    expect(res.status).toBe(401);

    const body = await parseResponse(res);
    expect(body.success).toBe(false);
  });

  it('handles requests with invalid session format', async () => {
    const res = await requestWithSession('/api/results/uploads', 'not-a-valid-uuid');
    expect(res.status).toBe(401);
  });
});

/**
 * Real User Tests
 *
 * These tests use your actual Bluesky session to verify the API works
 * with real authentication. They are SKIPPED unless TEST_SESSION is set.
 *
 * To run these tests:
 *   1. pnpm test:login
 *   2. set TEST_SESSION=<session-id> && pnpm test
 */
describe('Real User Tests', () => {
  // Skip all tests in this block if no real session
  const itReal = hasRealTestSession() ? it : it.skip;

  // Log which mode we're in
  beforeAll(() => {
    if (hasRealTestSession()) {
      console.log(`\n🔐 Running real user tests with session: ${REAL_TEST_SESSION.slice(0, 8)}...`);
    } else {
      console.log('\n⏭️  Skipping real user tests (TEST_SESSION not set)');
    }
  });

  describe('Authentication', () => {
    itReal('validates real session via /api/auth/session', async () => {
      const res = await request(`/api/auth/session?session=${REAL_TEST_SESSION}`);
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('did');
      expect(body.data.did).toMatch(/^did:/); // Real DID format

      console.log(`   ✅ Authenticated as: ${body.data.did}`);
    });
  });

  describe('GET /api/results/uploads (Real User)', () => {
    itReal('fetches real user uploads', async () => {
      const res = await realAuthRequest('/api/results/uploads');
      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('uploads');
      expect(Array.isArray(body.data.uploads)).toBe(true);

      console.log(`   📦 Found ${body.data.uploads.length} uploads for real user`);

      // Log summary of uploads if any exist
      if (body.data.uploads.length > 0) {
        body.data.uploads.forEach((upload: {
          uploadId: string;
          sourcePlatform: string;
          totalUsers: number;
          matchedUsers: number;
        }) => {
          console.log(`      - ${upload.sourcePlatform}: ${upload.totalUsers} users, ${upload.matchedUsers} matched`);
        });
      }
    });
  });

  describe('POST /api/results/save (Real User)', () => {
    itReal('can save and retrieve test data with real session', async () => {
      // Use a unique ID to avoid conflicts
      const uploadId = `real-test-${Date.now()}`;

      // Save some test data
      const saveRes = await realAuthRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'test',
          saveData: true,
          results: [
            {
              sourceUser: { username: 'realtest_user', date: '2024-01-01' },
              atprotoMatches: [],
            },
          ],
        }),
      });

      expect(saveRes.status).toBe(200);

      const saveBody = await parseResponse(saveRes);
      expect(saveBody.success).toBe(true);
      expect(saveBody.uploadId).toBe(uploadId);

      console.log(`   💾 Saved test upload: ${uploadId}`);

      // Verify it appears in uploads list
      const listRes = await realAuthRequest('/api/results/uploads');
      const listBody = await parseResponse(listRes);

      const found = listBody.data.uploads.find(
        (u: { uploadId: string }) => u.uploadId === uploadId
      );
      expect(found).toBeDefined();
      expect(found.sourcePlatform).toBe('test');

      console.log(`   ✅ Verified upload appears in list`);
    });

    itReal('respects saveData=false with real session', async () => {
      const uploadId = `real-nosave-${Date.now()}`;

      const res = await realAuthRequest('/api/results/save', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'test',
          saveData: false,
          results: [
            {
              sourceUser: { username: 'nosave_user', date: '' },
              atprotoMatches: [],
            },
          ],
        }),
      });

      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Data storage disabled');

      // Verify it was NOT saved
      const listRes = await realAuthRequest('/api/results/uploads');
      const listBody = await parseResponse(listRes);

      const found = listBody.data.uploads.find(
        (u: { uploadId: string }) => u.uploadId === uploadId
      );
      expect(found).toBeUndefined();

      console.log(`   ✅ Verified saveData=false works`);
    });
  });

  describe('GET /api/results/upload-details (Real User)', () => {
    itReal('fetches details for a real upload', async () => {
      // First check if user has any uploads
      const listRes = await realAuthRequest('/api/results/uploads');
      const listBody = await parseResponse(listRes);

      if (listBody.data.uploads.length === 0) {
        console.log('   ⏭️  No uploads found, skipping details test');
        return;
      }

      // Get details for the first upload
      const firstUpload = listBody.data.uploads[0];
      const res = await realAuthRequest(
        `/api/results/upload-details?uploadId=${firstUpload.uploadId}&page=1&pageSize=10`
      );

      expect(res.status).toBe(200);

      const body = await parseResponse(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('results');
      expect(body.data).toHaveProperty('pagination');

      console.log(`   📋 Upload "${firstUpload.uploadId}" has ${body.data.pagination.totalUsers} users`);
    });
  });
});
