/**
 * Test Setup
 * Configures environment and lifecycle hooks for integration tests
 */

import 'dotenv/config';
import { afterAll, beforeAll } from 'vitest';
import { cleanupAllTestSessions, cleanupAllTestData } from './fixtures';

// ============================================================================
// Environment Validation
// ============================================================================

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set - tests will fail');
  console.error('   Set it in packages/api/.env or as an environment variable');
  process.exit(1);
}

// ============================================================================
// Optional: Real User Testing
// ============================================================================

if (process.env.TEST_SESSION) {
  console.log('✅ TEST_SESSION set - real user tests available');
  console.log('   Use realAuthRequest() to test with your real Bluesky session');
} else {
  console.log('ℹ️  TEST_SESSION not set - using seeded test sessions');
  console.log('   Run: pnpm test:login to get a real session for testing');
}

// ============================================================================
// Token Encryption (optional in dev)
// ============================================================================

if (!process.env.TOKEN_ENCRYPTION_KEY) {
  // This is expected in development - suppress the warning in test output
  // by setting a test-only key (won't be used since we bypass OAuth)
  process.env.TOKEN_ENCRYPTION_KEY_BYPASS = 'test';
}

// ============================================================================
// Global Test Lifecycle
// ============================================================================

beforeAll(async () => {
  // Clean slate - remove any leftover test data from previous runs
  await cleanupAllTestSessions();
  console.log('🧹 Cleaned up previous test sessions');
});

afterAll(async () => {
  // Clean up all test data after the test run
  // Use cleanupAllTestData() if you want to clean uploads/matches too
  await cleanupAllTestSessions();
  console.log('🧹 Cleaned up test sessions');
});
