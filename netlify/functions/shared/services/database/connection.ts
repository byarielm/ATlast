import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { DatabaseError } from "../../constants/errors";

let sqlInstance: NeonQueryFunction<any, any> | undefined = undefined;
let connectionInitialized = false;

export function getDbClient(): NeonQueryFunction<any, any> {
  if (!sqlInstance) {
    if (!process.env.NETLIFY_DATABASE_URL) {
      throw new DatabaseError(
        "Database connection string not configured",
        "NETLIFY_DATABASE_URL environment variable is missing",
      );
    }

    try {
      sqlInstance = neon(process.env.NETLIFY_DATABASE_URL);
      connectionInitialized = true;
      if (process.env.NODE_ENV !== "production") {
        console.log("✅ Database connection initialized");
      }
    } catch (error) {
      throw new DatabaseError(
        "Failed to initialize database connection",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  return sqlInstance;
}

export function isConnectionInitialized(): boolean {
  return connectionInitialized;
}

// Reset connection (useful for testing)
export function resetConnection(): void {
  sqlInstance = undefined;
  connectionInitialized = false;
}
