/**
 * Test Helpers
 * Utilities for API integration testing
 */

import app from '../src/server';
import {
  TEST_USERS,
  TestUserId,
  getOrCreateTestSession,
  createTestSession,
} from './fixtures';

// ============================================================================
// Session Management
// ============================================================================

/**
 * Environment-based session for real user testing
 * Set TEST_SESSION env var to use a real Bluesky session
 */
export const REAL_TEST_SESSION = process.env.TEST_SESSION || '';

/**
 * Check if a real test session is available (for manual testing with real account)
 */
export function hasRealTestSession(): boolean {
  return !!REAL_TEST_SESSION;
}

/**
 * Session store for seeded test sessions
 * Maps test user IDs to their active session IDs
 */
const testSessionCache = new Map<TestUserId, string>();

/**
 * Get or create a session for a test user
 * Sessions are cached for reuse within the test run
 */
export async function getTestSession(userId: TestUserId = 'standard'): Promise<string> {
  let sessionId = testSessionCache.get(userId);

  if (!sessionId) {
    sessionId = await getOrCreateTestSession(userId);
    testSessionCache.set(userId, sessionId);
  }

  return sessionId;
}

/**
 * Create a fresh session (not cached)
 * Use when you need a new session for each test
 */
export async function createFreshTestSession(userId: TestUserId = 'standard'): Promise<string> {
  return createTestSession(userId);
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Make an authenticated request using a seeded test session
 *
 * @param path - API path (e.g., '/api/results/uploads')
 * @param options - Fetch options
 * @param userId - Test user to authenticate as (default: 'standard')
 */
export async function authRequest(
  path: string,
  options: RequestInit = {},
  userId: TestUserId = 'standard',
): Promise<Response> {
  const sessionId = await getTestSession(userId);
  const headers = new Headers(options.headers);

  headers.set('Cookie', `atlast_session_dev=${sessionId}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return app.request(path, {
    ...options,
    headers,
  });
}

/**
 * Make an authenticated request using a real session from TEST_SESSION env var
 * Use this for testing with a real Bluesky account
 */
export async function realAuthRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!REAL_TEST_SESSION) {
    throw new Error(
      'REAL_TEST_SESSION requires TEST_SESSION environment variable. ' +
        'Run: pnpm test:login to get a session ID.',
    );
  }

  const headers = new Headers(options.headers);
  headers.set('Cookie', `atlast_session_dev=${REAL_TEST_SESSION}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return app.request(path, {
    ...options,
    headers,
  });
}

/**
 * Make an unauthenticated request
 */
export async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return app.request(path, {
    ...options,
    headers,
  });
}

/**
 * Make a request with a specific session ID
 * Use when testing with custom or expired sessions
 */
export async function requestWithSession(
  path: string,
  sessionId: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Cookie', `atlast_session_dev=${sessionId}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return app.request(path, {
    ...options,
    headers,
  });
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Parse JSON response with type safety
 */
export async function parseResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * Generate unique test IDs with timestamp and random suffix
 */
export function testId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get test user info
 */
export function getTestUserInfo(userId: TestUserId) {
  return TEST_USERS[userId];
}

// ============================================================================
// Backward Compatibility
// ============================================================================

/**
 * @deprecated Use hasRealTestSession() instead
 */
export function hasTestSession(): boolean {
  return hasRealTestSession();
}

/**
 * @deprecated Use REAL_TEST_SESSION instead
 */
export const TEST_SESSION = REAL_TEST_SESSION;

/**
 * @deprecated No longer needed - sessions are seeded automatically
 */
export function skipIfNoSession(): boolean {
  return false; // Sessions are now always available via seeding
}
