/**
 * Test Fixtures
 *
 * Centralized exports for all test fixtures and utilities
 */

// Test user definitions
export {
  TEST_USERS,
  getTestUser,
  isTestUserDid,
  ALL_TEST_USER_DIDS,
} from './testUsers';
export type { TestUserId, TestUser } from './testUsers';

// Session management
export {
  createTestSession,
  createCustomTestSession,
  createExpiredTestSession,
  getOrCreateTestSession,
  deleteTestSession,
  cleanupAllTestSessions,
  cleanupAllTestData,
  countTestSessions,
} from './sessions';
export type { CreateSessionOptions } from './sessions';
