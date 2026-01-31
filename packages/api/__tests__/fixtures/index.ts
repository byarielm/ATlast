/**
 * Test Fixtures
 *
 * Centralized exports for all test fixtures and utilities
 */

// Test user definitions
export {
  TEST_USERS,
  TestUserId,
  TestUser,
  getTestUser,
  isTestUserDid,
  ALL_TEST_USER_DIDS,
} from './testUsers';

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
  CreateSessionOptions,
} from './sessions';
