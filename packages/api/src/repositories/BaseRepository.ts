/**
 * Base Repository for Kysely
 * Provides common database operations for all repositories
 */

import { db } from '../db/client';
import type { Database } from '../db/types';
import { Kysely } from 'kysely';

export abstract class BaseRepository {
  protected db: Kysely<Database>;

  constructor() {
    this.db = db;
  }

  /**
   * Helper: Build arrays organized by column for bulk insert operations
   * Returns arrays organized by column for database operations
   *
   * @example
   * const rows = [['val1', 'val2'], ['val3', 'val4']];
   * const [col1, col2] = buildArraysByColumn(['col1', 'col2'], rows);
   * // col1 = ['val1', 'val3'], col2 = ['val2', 'val4']
   */
  protected buildArraysByColumn<T extends unknown[]>(
    columns: string[],
    rows: T[],
  ): unknown[][] {
    return columns.map((_, colIndex) => rows.map((row) => row[colIndex]));
  }

  /**
   * Helper: Extract results into a Map
   * Common pattern for bulk operations that return id mappings
   *
   * @example
   * const results = [{id: 1, username: 'alice'}, {id: 2, username: 'bob'}];
   * const map = buildIdMap(results, 'username', 'id');
   * // map.get('alice') === 1
   */
  protected buildIdMap<T extends Record<string, string | number>>(
    results: T[],
    keyField: keyof T,
    valueField: keyof T = 'id' as keyof T,
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of results) {
      const key = row[keyField];
      const value = row[valueField];
      if (typeof key === 'string' && typeof value === 'number') {
        map.set(key, value);
      }
    }
    return map;
  }
}
