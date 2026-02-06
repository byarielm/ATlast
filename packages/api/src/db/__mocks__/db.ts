/**
 * Database Mock Helpers
 * Utilities for mocking database failures in tests
 */

import { Kysely } from 'kysely';
import type { Database } from '../types';

export interface MockDbOptions {
  shouldFail?: boolean;
  error?: string | Error;
  delay?: number;
}

/**
 * Create a mock database instance that can simulate failures
 */
export function createMockDb(options: MockDbOptions = {}): Kysely<Database> {
  const {
    shouldFail = false,
    error = new Error('Mock database error'),
    delay = 0,
  } = options;

  const errorToThrow = typeof error === 'string' ? new Error(error) : error;

  // Create a basic mock that throws on execute
  const mockExecute = async () => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (shouldFail) {
      throw errorToThrow;
    }

    return [];
  };

  // Mock query builder chain
  const createMockBuilder = () => ({
    selectFrom: () => createMockBuilder(),
    select: () => createMockBuilder(),
    selectAll: () => createMockBuilder(),
    where: () => createMockBuilder(),
    orderBy: () => createMockBuilder(),
    limit: () => createMockBuilder(),
    offset: () => createMockBuilder(),
    insertInto: () => createMockBuilder(),
    values: () => createMockBuilder(),
    returning: () => createMockBuilder(),
    returningAll: () => createMockBuilder(),
    update: () => createMockBuilder(),
    set: () => createMockBuilder(),
    deleteFrom: () => createMockBuilder(),
    execute: mockExecute,
    executeTakeFirst: mockExecute,
    executeTakeFirstOrThrow: mockExecute,
  });

  return createMockBuilder() as unknown as Kysely<Database>;
}

/**
 * Mock connection error (database unreachable)
 */
export function createConnectionError(): Error {
  const err = new Error('connect ECONNREFUSED 127.0.0.1:5432');
  (err as NodeJS.ErrnoException).code = 'ECONNREFUSED';
  return err;
}

/**
 * Mock query timeout error
 */
export function createTimeoutError(): Error {
  const err = new Error('Query timeout exceeded');
  (err as NodeJS.ErrnoException).code = 'ETIMEDOUT';
  return err;
}

/**
 * Mock constraint violation error
 */
export function createConstraintError(constraint: string): Error {
  const err = new Error(`duplicate key value violates unique constraint "${constraint}"`);
  (err as Error & { code: string }).code = '23505'; // PostgreSQL unique violation code
  return err;
}

/**
 * Mock foreign key violation error
 */
export function createForeignKeyError(constraint: string): Error {
  const err = new Error(`insert or update on table violates foreign key constraint "${constraint}"`);
  (err as Error & { code: string }).code = '23503'; // PostgreSQL FK violation code
  return err;
}

/**
 * Mock connection pool exhaustion error
 */
export function createPoolExhaustedError(): Error {
  return new Error('Connection pool exhausted - all connections are in use');
}

/**
 * Mock transaction rollback error
 */
export function createTransactionError(): Error {
  return new Error('Transaction was rolled back due to an error');
}
