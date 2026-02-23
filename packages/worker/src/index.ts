/**
 * BullMQ Worker — Main Entry Point
 * Connects to Redis and PostgreSQL, registers job handlers,
 * and schedules the daily cleanup cron job.
 */

import { Worker } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { config } from "dotenv";
import { cleanupQueue, testRedisConnection } from "./queues";
import { handleCleanupJob } from "./jobs/cleanupJob";
import { testConnection, closeConnection } from "./db/client";

// Load .env before anything reads process.env
config();

/**
 * Build connection options for the Worker.
 * We use the same URL-to-options parser as queues.ts.
 * BullMQ requires separate connection objects for Queue vs Worker.
 */
function buildWorkerConnectionOptions(): ConnectionOptions {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    db: Number(parsed.pathname.slice(1)) || 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

/**
 * Cleanup Worker
 * concurrency: 1 — cleanup is idempotent but there's no benefit to parallel
 * runs; keep it simple for Phase 1.
 */
const cleanupWorker = new Worker("cleanup", handleCleanupJob, {
  connection: buildWorkerConnectionOptions(),
  concurrency: 1,
  lockDuration: 60000, // 60 s max lock — cleanup shouldn't take longer
});

cleanupWorker.on("completed", (job) => {
  console.log(`[WORKER] Job ${job.id} completed`);
});

cleanupWorker.on("failed", (job, error) => {
  console.error(`[WORKER] Job ${job?.id} failed: ${error.message}`);
});

cleanupWorker.on("error", (error) => {
  console.error("[WORKER] Worker error:", error);
});

async function start(): Promise<void> {
  console.log("🚀 [WORKER] Starting BullMQ worker...");

  await testRedisConnection();
  await testConnection();

  // Add recurring cleanup job — fixed jobId prevents duplicates on restart
  await cleanupQueue.add(
    "daily-cleanup",
    {},
    {
      repeat: { pattern: "0 2 * * *" }, // 2 AM daily
      jobId: "cleanup-daily",
    }
  );

  console.log("✅ [WORKER] Worker started");
  console.log("📅 [WORKER] Cleanup scheduled for 2 AM daily");
  console.log("⏳ [WORKER] Waiting for jobs...");
}

async function shutdown(): Promise<void> {
  console.log("\n⚠️  [WORKER] Shutting down...");
  try {
    await cleanupWorker.close();
    await closeConnection();
    console.log("✅ [WORKER] Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ [WORKER] Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => { void shutdown(); });
process.on("SIGINT", () => { void shutdown(); });

process.on("uncaughtException", (error) => {
  console.error("❌ [WORKER] Uncaught exception:", error);
  void shutdown();
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ [WORKER] Unhandled rejection:", reason);
  void shutdown();
});

start().catch((error: unknown) => {
  console.error("❌ [WORKER] Failed to start:", error);
  process.exit(1);
});
