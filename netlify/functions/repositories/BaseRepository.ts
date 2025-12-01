import { getDbClient } from "../infrastructure/database/DatabaseConnection";
import { NeonQueryFunction } from "@neondatabase/serverless";

export abstract class BaseRepository {
  protected sql: NeonQueryFunction<any, any>;

  constructor() {
    this.sql = getDbClient();
  }

  /**
   * Execute a raw query
   */
  protected async query<T>(
    queryFn: (sql: NeonQueryFunction<any, any>) => Promise<T>,
  ): Promise<T> {
    return await queryFn(this.sql);
  }

  /**
   * Helper: Build UNNEST arrays for bulk operations
   * Returns arrays organized by column for UNNEST pattern
   */
  protected buildUnnestArrays<T extends any[]>(
    columns: string[],
    rows: T[],
  ): any[][] {
    return columns.map((_, colIndex) => rows.map((row) => row[colIndex]));
  }

  /**
   * Helper: Extract results into a Map
   * Common pattern for bulk operations that return id mappings
   */
  protected buildIdMap<T extends Record<string, any>>(
    results: T[],
    keyField: string,
    valueField: string = "id",
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of results) {
      map.set(row[keyField], row[valueField]);
    }
    return map;
  }
}
