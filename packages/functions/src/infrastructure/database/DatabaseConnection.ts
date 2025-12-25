import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { DatabaseError } from "../../core/errors";

/**
 * Singleton Database Connection Manager
 * Ensures single connection instance across all function invocations
 **/
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private sql: NeonQueryFunction<any, any> | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  getClient(): NeonQueryFunction<any, any> {
    if (!this.sql) {
      this.initialize();
    }
    return this.sql!;
  }

  private initialize(): void {
    if (this.initialized) return;

    if (!process.env.NETLIFY_DATABASE_URL) {
      throw new DatabaseError(
        "Database connection string not configured",
        "NETLIFY_DATABASE_URL environment variable is missing",
      );
    }

    try {
      this.sql = neon(process.env.NETLIFY_DATABASE_URL);
      this.initialized = true;

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

  isInitialized(): boolean {
    return this.initialized;
  }

  // For testing purposes only
  reset(): void {
    this.sql = null;
    this.initialized = false;
  }
}

// Export singleton instance methods
const dbConnection = DatabaseConnection.getInstance();

export const getDbClient = () => dbConnection.getClient();
export const isConnectionInitialized = () => dbConnection.isInitialized();
export const resetConnection = () => dbConnection.reset();
