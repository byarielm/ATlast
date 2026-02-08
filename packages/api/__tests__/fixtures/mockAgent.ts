/**
 * Mock AT Protocol Agent
 *
 * Provides a configurable mock agent for deterministic testing
 * of search and follow route error scenarios without real AT Protocol calls.
 */

import { vi } from 'vitest';
import type { Agent } from '@atproto/api';

// ============================================================================
// Types
// ============================================================================

/** Shape of actor returned by searchActors */
export interface MockActor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

/** Shape of profile returned by getProfiles */
export interface MockProfile {
  did: string;
  handle: string;
  displayName?: string;
  postsCount?: number;
  followersCount?: number;
}

/** Shape of record returned by listRecords */
export interface MockFollowRecord {
  uri: string;
  cid: string;
  value: {
    subject: string;
    createdAt: string;
  };
}

/** Configuration for mock agent behavior */
export interface MockAgentOptions {
  /** Mock searchActors response or error */
  searchActors?: (params: { q: string; limit: number }) => Promise<{
    data: { actors: MockActor[] };
  }>;
  /** Mock getProfiles response or error */
  getProfiles?: (params: { actors: string[] }) => Promise<{
    data: { profiles: MockProfile[] };
  }>;
  /** Mock createRecord response or error */
  createRecord?: (params: {
    repo: string;
    collection: string;
    record: Record<string, unknown>;
  }) => Promise<{ uri: string; cid: string }>;
  /** Mock listRecords response or error */
  listRecords?: (params: {
    repo: string;
    collection: string;
    limit: number;
    cursor?: string;
  }) => Promise<{
    data: { records: MockFollowRecord[]; cursor?: string };
  }>;
}

// ============================================================================
// Mock Agent Factory
// ============================================================================

/**
 * Creates a mock AT Protocol agent with configurable behavior.
 *
 * Default behavior returns empty/successful responses.
 * Override individual methods to simulate errors, rate limits, etc.
 */
export function createMockAgent(options: MockAgentOptions = {}): Agent {
  const searchActorsFn =
    options.searchActors ??
    (async () => ({ data: { actors: [] as MockActor[] } }));

  const getProfilesFn =
    options.getProfiles ??
    (async () => ({ data: { profiles: [] as MockProfile[] } }));

  const createRecordFn =
    options.createRecord ??
    (async () => ({ uri: 'at://did:plc:mock/app.bsky.graph.follow/mock', cid: 'mock-cid' }));

  const listRecordsFn =
    options.listRecords ??
    (async () => ({ data: { records: [] as MockFollowRecord[], cursor: undefined } }));

  // Build the mock agent with the nested structure matching @atproto/api Agent
  const mockAgent = {
    app: {
      bsky: {
        actor: {
          searchActors: vi.fn().mockImplementation(searchActorsFn),
          getProfiles: vi.fn().mockImplementation(getProfilesFn),
        },
      },
    },
    api: {
      com: {
        atproto: {
          repo: {
            createRecord: vi.fn().mockImplementation(createRecordFn),
            listRecords: vi.fn().mockImplementation(listRecordsFn),
          },
        },
      },
    },
  } as unknown as Agent;

  return mockAgent;
}

// ============================================================================
// Pre-built Error Scenarios
// ============================================================================

/** Creates a mock agent that throws network timeout errors on search */
export function createTimeoutAgent(): Agent {
  return createMockAgent({
    searchActors: async () => {
      const error = new Error('request to https://bsky.social timed out');
      error.name = 'FetchError';
      throw error;
    },
    getProfiles: async () => {
      const error = new Error('request to https://bsky.social timed out');
      error.name = 'FetchError';
      throw error;
    },
    createRecord: async () => {
      const error = new Error('request to https://bsky.social timed out');
      error.name = 'FetchError';
      throw error;
    },
    listRecords: async () => {
      const error = new Error('request to https://bsky.social timed out');
      error.name = 'FetchError';
      throw error;
    },
  });
}

/** Creates a mock agent that returns 429 rate limit errors */
export function createRateLimitAgent(): Agent {
  return createMockAgent({
    searchActors: async () => {
      const error = new Error('Rate Limit Exceeded');
      (error as NodeJS.ErrnoException).cause = { status: 429 };
      throw error;
    },
    createRecord: async () => {
      const error = new Error('rate limit exceeded - 429');
      throw error;
    },
    listRecords: async () => {
      const error = new Error('Rate Limit Exceeded');
      throw error;
    },
  });
}

/** Creates a mock agent that returns 503 Service Unavailable */
export function createServiceUnavailableAgent(): Agent {
  return createMockAgent({
    searchActors: async () => {
      const error = new Error('Service Unavailable');
      (error as NodeJS.ErrnoException).cause = { status: 503 };
      throw error;
    },
    createRecord: async () => {
      const error = new Error('Service Unavailable');
      throw error;
    },
    listRecords: async () => {
      const error = new Error('Service Unavailable');
      throw error;
    },
  });
}

/**
 * Creates a mock agent where searchActors partially fails.
 * Succeeds for usernames starting with 'good', fails for others.
 */
export function createPartialFailureSearchAgent(): Agent {
  return createMockAgent({
    searchActors: async ({ q }: { q: string; limit: number }) => {
      if (!q.startsWith('good')) {
        throw new Error(`Search failed for "${q}"`);
      }
      return {
        data: {
          actors: [
            {
              did: `did:plc:${q}`,
              handle: `${q}.bsky.social`,
              displayName: q,
            },
          ],
        },
      };
    },
    getProfiles: async ({ actors }: { actors: string[] }) => ({
      data: {
        profiles: actors.map((did) => ({
          did,
          handle: `${did.split(':').pop()}.bsky.social`,
          postsCount: 10,
          followersCount: 100,
        })),
      },
    }),
  });
}

/**
 * Creates a mock agent that returns actors for search
 * and succeeds on profiles and follow status checks.
 */
export function createSuccessfulSearchAgent(
  actorMap: Record<string, MockActor[]> = {},
): Agent {
  return createMockAgent({
    searchActors: async ({ q }: { q: string; limit: number }) => ({
      data: {
        actors: actorMap[q] ?? [
          {
            did: `did:plc:${q}`,
            handle: `${q}.bsky.social`,
            displayName: q,
          },
        ],
      },
    }),
    getProfiles: async ({ actors }: { actors: string[] }) => ({
      data: {
        profiles: actors.map((did) => ({
          did,
          handle: `${did.split(':').pop()}.bsky.social`,
          postsCount: 42,
          followersCount: 100,
        })),
      },
    }),
    listRecords: async () => ({
      data: { records: [], cursor: undefined },
    }),
  });
}

/**
 * Creates a mock agent for follow operations.
 * Configurable: which DIDs are already followed, which fail.
 */
export function createFollowAgent(opts: {
  alreadyFollowing?: string[];
  failDids?: string[];
} = {}): Agent {
  const { alreadyFollowing = [], failDids = [] } = opts;
  const alreadyFollowingSet = new Set(alreadyFollowing);
  const failDidsSet = new Set(failDids);

  return createMockAgent({
    listRecords: async () => ({
      data: {
        records: alreadyFollowing.map((did) => ({
          uri: `at://did:plc:mock/app.bsky.graph.follow/${did}`,
          cid: 'mock-cid',
          value: { subject: did, createdAt: new Date().toISOString() },
        })),
        cursor: undefined,
      },
    }),
    createRecord: async (params) => {
      const targetDid = (params.record as { subject?: string }).subject ?? '';

      if (alreadyFollowingSet.has(targetDid)) {
        throw new Error('Record already exists');
      }
      if (failDidsSet.has(targetDid)) {
        throw new Error('Follow failed for test');
      }
      return {
        uri: `at://did:plc:mock/app.bsky.graph.follow/${Date.now()}`,
        cid: 'mock-cid',
      };
    },
  });
}

/**
 * Creates a mock agent that returns malformed/unexpected response structures.
 */
export function createMalformedResponseAgent(): Agent {
  return createMockAgent({
    searchActors: async () => ({
      data: {
        // Actors with empty/missing fields - should not crash the ranking code
        actors: [
          { did: '', handle: '' } as MockActor,
          { did: 'did:plc:empty', handle: '', displayName: '' } as MockActor,
        ],
      },
    }),
    getProfiles: async () => ({
      data: {
        profiles: [
          {
            did: '',
            handle: '',
            postsCount: 0,
            followersCount: 0,
          } as unknown as MockProfile,
        ],
      },
    }),
  });
}
