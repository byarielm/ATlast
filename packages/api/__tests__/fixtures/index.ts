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

// Mock AT Protocol agent
export {
  createMockAgent,
  createTimeoutAgent,
  createRateLimitAgent,
  createServiceUnavailableAgent,
  createPartialFailureSearchAgent,
  createSuccessfulSearchAgent,
  createFollowAgent,
  createMalformedResponseAgent,
} from './mockAgent';
export type {
  MockActor,
  MockProfile,
  MockFollowRecord,
  MockAgentOptions,
} from './mockAgent';

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
