/**
 * Kysely Database Client
 * Connection pooling and query builder for PostgreSQL
 */

import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

/**
 * PostgreSQL connection pool
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Kysely database instance
 */
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

/**
 * Fuzzy search helper using pg_trgm extension
 *
 * Searches for usernames similar to the provided username using trigram similarity.
 * The % operator calculates similarity, and results are ordered by similarity score.
 *
 * @param username - The username to search for
 * @param limit - Maximum number of results to return (default: 100)
 * @returns Array of matching source accounts ordered by similarity
 *
 * @example
 * ```ts
 * const matches = await fuzzySearchUsernames('johndoe', 10);
 * // Returns up to 10 accounts similar to 'johndoe'
 * ```
 */
export async function fuzzySearchUsernames(
  username: string,
  limit: number = 100,
) {
  return db
    .selectFrom("source_accounts")
    .selectAll()
    .where(sql<boolean>`normalized_username % ${username}`) // % is similarity operator
    .orderBy(sql`similarity(normalized_username, ${username})`, "desc")
    .limit(limit)
    .execute();
}

/**
 * Test database connection
 *
 * @returns Promise that resolves if connection is successful
 * @throws Error if connection fails
 */
export async function testConnection(): Promise<void> {
  try {
    await sql`SELECT 1`.execute(db);
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

/**
 * Close database connection pool
 * Use this for graceful shutdown
 */
export async function closeConnection(): Promise<void> {
  await db.destroy();
  console.log("Database connection pool closed");
}
