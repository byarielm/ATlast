/**
 * Worker Test Setup
 * Runs before all tests to configure the environment.
 */

import { config } from "dotenv";

// Load .env.test if present (overrides are fine — test env wins)
config({ path: ".env.test" });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://atlast:localdev@localhost:5432/atlast";
}

if (!process.env.REDIS_URL) {
  // Use Redis DB index 1 for tests to avoid colliding with dev data
  process.env.REDIS_URL = "redis://localhost:6379/1";
}
