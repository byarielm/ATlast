/**
 * Cleanup Job Integration Tests
 *
 * Inserts real rows into the test database, calls handleCleanupJob(),
 * and verifies the PostgreSQL cleanup_transient_data() function removed
 * exactly the expired rows (and kept the fresh ones).
 *
 * Column names match the actual schema in scripts/init-db.sql:
 *   oauth_states:   state (PK), data (JSONB), created_at
 *   user_sessions:  session_id (PK), did, fingerprint, expires_at
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Job } from "bullmq";
import { sql } from "kysely";
import { db, closeConnection } from "../src/db/client";
import { handleCleanupJob } from "../src/jobs/cleanupJob";
import type { CleanupJobData } from "../src/jobs/cleanupJob";

/** Minimal mock of a BullMQ Job — only the fields our handler accesses */
function mockJob(id: string): Job<CleanupJobData> {
  return { id, attemptsMade: 0 } as Job<CleanupJobData>;
}

describe("Cleanup Job", () => {
  beforeAll(async () => {
    // Smoke-test the DB connection before running tests
    await sql`SELECT 1`.execute(db);
  });

  afterAll(async () => {
    await closeConnection();
  });

  beforeEach(async () => {
    // Remove test rows left from a previous run
    await sql`DELETE FROM oauth_states   WHERE state      LIKE 'test-%'`.execute(db);
    await sql`DELETE FROM user_sessions  WHERE session_id LIKE 'test-%'`.execute(db);
  });

  it("removes expired OAuth states and keeps fresh ones", async () => {
    // Expired: created 2 hours ago (threshold is 1 hour)
    await sql`
      INSERT INTO oauth_states (state, data, created_at)
      VALUES ('test-expired-state', '{}', NOW() - INTERVAL '2 hours')
    `.execute(db);

    // Fresh: created 30 seconds ago — must survive cleanup
    await sql`
      INSERT INTO oauth_states (state, data, created_at)
      VALUES ('test-fresh-state', '{}', NOW() - INTERVAL '30 seconds')
    `.execute(db);

    const result = await handleCleanupJob(mockJob("test-job-1"));

    expect(result.cleaned).toBe(true);
    expect(result.timestamp).toBeDefined();

    const rows = await sql<{ state: string }>`
      SELECT state FROM oauth_states WHERE state LIKE 'test-%'
    `.execute(db);

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].state).toBe("test-fresh-state");
  });

  it("removes expired user sessions and keeps valid ones", async () => {
    // Expired: expires_at in the past
    await sql`
      INSERT INTO user_sessions (session_id, did, fingerprint, expires_at)
      VALUES ('test-expired-session', 'did:plc:test-cleanup-1', 'fp', NOW() - INTERVAL '1 day')
    `.execute(db);

    // Valid: expires_at in the future
    await sql`
      INSERT INTO user_sessions (session_id, did, fingerprint, expires_at)
      VALUES ('test-valid-session', 'did:plc:test-cleanup-2', 'fp', NOW() + INTERVAL '7 days')
    `.execute(db);

    await handleCleanupJob(mockJob("test-job-2"));

    const rows = await sql<{ session_id: string }>`
      SELECT session_id FROM user_sessions WHERE session_id LIKE 'test-%'
    `.execute(db);

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].session_id).toBe("test-valid-session");
  });

  it("completes successfully when there is nothing to clean", async () => {
    const result = await handleCleanupJob(mockJob("test-job-3"));

    expect(result.cleaned).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it("returns a valid ISO timestamp", async () => {
    const result = await handleCleanupJob(mockJob("test-job-4"));

    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
