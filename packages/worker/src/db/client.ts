/**
 * Worker Database Client
 * Kysely connection for PostgreSQL — uses a smaller pool than the API
 * since workers process jobs sequentially rather than handling concurrent requests.
 */

import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { Database } from "@atlast/shared/types/database";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Smaller pool — workers run fewer concurrent queries than the API
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

/**
 * Verify database connectivity on startup.
 * Throws if the connection cannot be established.
 */
export async function testConnection(): Promise<void> {
  try {
    await sql`SELECT 1`.execute(db);
    console.log("✅ [WORKER] Database connection successful");
  } catch (error) {
    console.error("❌ [WORKER] Database connection failed:", error);
    throw error;
  }
}

/**
 * Destroy the connection pool.
 * Call during graceful shutdown to avoid hanging processes.
 */
export async function closeConnection(): Promise<void> {
  await db.destroy();
  console.log("[WORKER] Database connection pool closed");
}
