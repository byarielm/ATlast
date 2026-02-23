/**
 * BullMQ Queue Configuration
 * Defines the cleanup queue used by both the API (to add jobs)
 * and the worker process (to consume them).
 *
 * We pass connection options objects (not Redis instances) to avoid a
 * TypeScript structural mismatch between the IORedis.Redis namespace type
 * used in BullMQ's ConnectionOptions and the default-imported Redis class.
 * BullMQ creates and manages its own Redis connections from these options.
 */

import { Queue } from "bullmq";
import Redis from "ioredis";
import type { ConnectionOptions } from "bullmq";

/**
 * Parse the REDIS_URL environment variable into a ConnectionOptions object.
 * Supports: redis://host:port/db  (database index via path segment)
 */
function buildConnectionOptions(): ConnectionOptions {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    db: Number(parsed.pathname.slice(1)) || 0,
    maxRetriesPerRequest: null, // Required by BullMQ — disables per-command timeout
    enableReadyCheck: false,    // Skip ready check RTT on startup
  };
}

/**
 * Cleanup Queue
 * Handles periodic removal of expired transient data:
 *   - oauth_states older than 1 hour
 *   - user_sessions past their expires_at
 *   - sent notification_queue rows older than 7 days
 *   - failed notification_queue rows older than 30 days
 */
export const cleanupQueue = new Queue("cleanup", {
  connection: buildConnectionOptions(),
  defaultJobOptions: {
    attempts: 2, // Retry once on failure
    backoff: {
      type: "exponential",
      delay: 5000, // 5 s → 10 s between retries
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 h (debugging)
      count: 10,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 100,
    },
  },
});

/**
 * Verify Redis connectivity using a short-lived client.
 * Throws if the connection cannot be established.
 */
export async function testRedisConnection(): Promise<void> {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  try {
    await client.ping();
    console.log("✅ [WORKER] Redis connection successful");
  } catch (error) {
    console.error("❌ [WORKER] Redis connection failed:", error);
    throw error;
  } finally {
    client.disconnect();
  }
}
