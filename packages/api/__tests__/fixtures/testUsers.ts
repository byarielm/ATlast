/**
 * Test User Fixtures
 *
 * Defines test users with different "roles" for testing various scenarios.
 * These are synthetic DIDs that follow the AT Protocol DID format but are
 * clearly marked as test accounts.
 *
 * Note: ATlast doesn't have a permission system yet, but this structure
 * allows for easy extension when/if permissions are added.
 */

export interface TestUser {
  /** Unique identifier for this test user */
  id: string;
  /** AT Protocol DID - uses 'test' prefix to avoid collision with real DIDs */
  did: string;
  /** Human-readable description */
  description: string;
  /** Optional: simulated handle for display purposes */
  handle?: string;
}

/**
 * Predefined test users for different testing scenarios
 */
export const TEST_USERS = {
  /**
   * Standard user - typical user with normal access
   * Use for most integration tests
   */
  standard: {
    id: 'standard',
    did: 'did:plc:test-standard-user-001',
    description: 'Standard test user for typical operations',
    handle: 'testuser.bsky.social',
  },

  /**
   * Power user - user with lots of data (uploads, matches)
   * Use for pagination and performance tests
   */
  power: {
    id: 'power',
    did: 'did:plc:test-power-user-002',
    description: 'Power user with extensive data for stress testing',
    handle: 'poweruser.bsky.social',
  },

  /**
   * New user - freshly created account with no data
   * Use for testing empty states and onboarding flows
   */
  new: {
    id: 'new',
    did: 'did:plc:test-new-user-003',
    description: 'New user with no uploads or matches',
    handle: 'newuser.bsky.social',
  },

  /**
   * Expired user - for testing session expiry handling
   * Sessions for this user are created with past expiry dates
   */
  expired: {
    id: 'expired',
    did: 'did:plc:test-expired-user-004',
    description: 'User for testing expired session handling',
    handle: 'expired.bsky.social',
  },
} as const satisfies Record<string, TestUser>;

export type TestUserId = keyof typeof TEST_USERS;

/**
 * Get a test user by ID
 */
export function getTestUser(id: TestUserId): TestUser {
  return TEST_USERS[id];
}

/**
 * Check if a DID is a test user DID
 * Useful for cleanup and safety checks
 */
export function isTestUserDid(did: string): boolean {
  return did.startsWith('did:plc:test-');
}

/**
 * All test user DIDs for cleanup queries
 */
export const ALL_TEST_USER_DIDS = Object.values(TEST_USERS).map((u) => u.did);
