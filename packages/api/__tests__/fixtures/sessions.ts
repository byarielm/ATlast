/**
 * Test Session Management
 *
 * Provides functions to create, manage, and clean up test sessions.
 * Sessions are seeded directly into the database, bypassing OAuth for testing.
 */

import * as crypto from 'crypto';
import { db } from '../../src/db/client';
import { TEST_USERS, TestUserId, isTestUserDid, ALL_TEST_USER_DIDS } from './testUsers';

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Active test sessions - maps user ID to session ID
 * Used to reuse sessions within a test run and for cleanup
 */
const activeTestSessions = new Map<string, string>();

export interface CreateSessionOptions {
  /** Override the default expiry (7 days from now) */
  expiresAt?: Date;
  /** Custom fingerprint data */
  fingerprint?: Record<string, unknown>;
}

/**
 * Create a test session for a predefined test user
 *
 * @param userId - The test user ID (e.g., 'standard', 'power', 'new')
 * @param options - Optional session configuration
 * @returns The session ID
 *
 * @example
 * ```ts
 * const sessionId = await createTestSession('standard');
 * // Use in requests: Cookie: atlast_session_dev=${sessionId}
 * ```
 */
export async function createTestSession(
  userId: TestUserId = 'standard',
  options: CreateSessionOptions = {},
): Promise<string> {
  const user = TEST_USERS[userId];
  const sessionId = crypto.randomUUID();

  const expiresAt = options.expiresAt ?? new Date(Date.now() + SESSION_EXPIRY_MS);
  const fingerprint = JSON.stringify(options.fingerprint ?? { test: true, userId });

  await db
    .insertInto('user_sessions')
    .values({
      session_id: sessionId,
      did: user.did,
      fingerprint,
      expires_at: expiresAt,
    })
    .execute();

  // Track active session for cleanup
  activeTestSessions.set(userId, sessionId);

  return sessionId;
}

/**
 * Create a test session with a custom DID
 * Use this when you need a DID not in the predefined test users
 *
 * @param did - The DID to create a session for (must start with 'did:plc:test-')
 * @param options - Optional session configuration
 * @returns The session ID
 */
export async function createCustomTestSession(
  did: string,
  options: CreateSessionOptions = {},
): Promise<string> {
  // Safety check: only allow test DIDs
  if (!isTestUserDid(did)) {
    throw new Error(
      `Safety check failed: DID must start with 'did:plc:test-' for test sessions. Got: ${did}`,
    );
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = options.expiresAt ?? new Date(Date.now() + SESSION_EXPIRY_MS);
  const fingerprint = JSON.stringify(options.fingerprint ?? { test: true, customDid: true });

  await db
    .insertInto('user_sessions')
    .values({
      session_id: sessionId,
      did,
      fingerprint,
      expires_at: expiresAt,
    })
    .execute();

  activeTestSessions.set(did, sessionId);

  return sessionId;
}

/**
 * Create an expired session for testing session expiry handling
 *
 * @param userId - The test user ID
 * @returns The expired session ID
 */
export async function createExpiredTestSession(
  userId: TestUserId = 'expired',
): Promise<string> {
  // Expired 1 hour ago
  const expiresAt = new Date(Date.now() - 60 * 60 * 1000);

  return createTestSession(userId, { expiresAt });
}

/**
 * Get an existing test session or create one
 * Useful for reusing sessions across tests in the same run
 *
 * @param userId - The test user ID
 * @returns The session ID
 */
export async function getOrCreateTestSession(userId: TestUserId = 'standard'): Promise<string> {
  const existing = activeTestSessions.get(userId);

  if (existing) {
    // Verify session still exists in DB
    const session = await db
      .selectFrom('user_sessions')
      .select('session_id')
      .where('session_id', '=', existing)
      .where('expires_at', '>', new Date())
      .executeTakeFirst();

    if (session) {
      return existing;
    }
  }

  // Create new session
  return createTestSession(userId);
}

/**
 * Delete a specific test session
 *
 * @param sessionId - The session ID to delete
 */
export async function deleteTestSession(sessionId: string): Promise<void> {
  await db.deleteFrom('user_sessions').where('session_id', '=', sessionId).execute();

  // Remove from active sessions map
  for (const [key, value] of activeTestSessions.entries()) {
    if (value === sessionId) {
      activeTestSessions.delete(key);
      break;
    }
  }
}

/**
 * Clean up all test sessions from the database
 * Call this in afterAll() or after test runs
 */
export async function cleanupAllTestSessions(): Promise<void> {
  // Delete sessions for all known test user DIDs
  await db
    .deleteFrom('user_sessions')
    .where('did', 'in', ALL_TEST_USER_DIDS)
    .execute();

  // Also delete any sessions with 'did:plc:test-' prefix (custom test sessions)
  await db
    .deleteFrom('user_sessions')
    .where('did', 'like', 'did:plc:test-%')
    .execute();

  // Clear the active sessions map
  activeTestSessions.clear();
}

/**
 * Clean up all test data (sessions, uploads, matches, etc.)
 * Use with caution - this removes ALL data for test users
 */
export async function cleanupAllTestData(): Promise<void> {
  const testDidPattern = 'did:plc:test-%';

  // Delete in order respecting foreign keys
  // 1. User match status (references atproto_matches)
  await db
    .deleteFrom('user_match_status')
    .where('user_did', 'like', testDidPattern)
    .execute();

  // 2. Notification queue (references user_did and match_id)
  await db
    .deleteFrom('notification_queue')
    .where('user_did', 'like', testDidPattern)
    .execute();

  // 3. User source follows (join table)
  await db
    .deleteFrom('user_source_follows')
    .where('user_did', 'like', testDidPattern)
    .execute();

  // 4. User uploads
  await db
    .deleteFrom('user_uploads')
    .where('user_did', 'like', testDidPattern)
    .execute();

  // 5. User sessions
  await cleanupAllTestSessions();

  console.log('🧹 Cleaned up all test data');
}

/**
 * Get the count of active test sessions (for debugging)
 */
export async function countTestSessions(): Promise<number> {
  const result = await db
    .selectFrom('user_sessions')
    .select((eb) => eb.fn.count('session_id').as('count'))
    .where('did', 'like', 'did:plc:test-%')
    .executeTakeFirst();

  return Number(result?.count ?? 0);
}
