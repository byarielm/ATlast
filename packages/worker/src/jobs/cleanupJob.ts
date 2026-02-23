/**
 * Cleanup Job Handler
 * Invokes the PostgreSQL cleanup_transient_data() function which atomically
 * removes expired OAuth states, sessions, and old notifications.
 */

import type { Job } from "bullmq";
import { sql } from "kysely";
import { db } from "../db/client";

export interface CleanupJobData {
  // Scheduled job — no input data required
}

export interface CleanupJobResult {
  cleaned: boolean;
  timestamp: string;
}

/**
 * Execute the cleanup job.
 * Delegates to the cleanup_transient_data() SQL function defined in init-db.sql.
 * Re-throws on failure so BullMQ can mark the job failed and schedule a retry.
 */
export async function handleCleanupJob(
  job: Job<CleanupJobData>
): Promise<CleanupJobResult> {
  const startTime = Date.now();
  console.log(`[CLEANUP] Starting cleanup job ${job.id}...`);

  try {
    await sql`SELECT cleanup_transient_data()`.execute(db);

    const duration = Date.now() - startTime;
    console.log(`[CLEANUP] ✅ Completed in ${duration}ms`);

    return { cleaned: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("[CLEANUP] ❌ Failed:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });

    throw error; // Let BullMQ handle retry logic
  }
}
