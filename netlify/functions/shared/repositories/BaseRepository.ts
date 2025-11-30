import { getDbClient } from "../services/database/connection";
import { NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Base repository class providing common database access patterns
 **/
export abstract class BaseRepository {
  protected sql: NeonQueryFunction<any, any>;

  constructor() {
    this.sql = getDbClient();
  }

  /**
   * Execute a raw query
   **/
  protected async query<T>(
    queryFn: (sql: NeonQueryFunction<any, any>) => Promise<T>,
  ): Promise<T> {
    return await queryFn(this.sql);
  }
}
