/**
 * Error Handler Middleware Tests
 * Tests for error handler middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono, Context } from 'hono';
import { ZodError, z } from 'zod';
import { errorHandler } from './error';
import {
  ApiError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  DatabaseError,
} from '../errors';

describe('Error Handler Middleware', () => {
  let app: Hono;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler);

    // Spy on console.error to verify logging
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Validation Errors', () => {
    it('returns 400 for ValidationError', async () => {
      app.get('/test', () => {
        throw new ValidationError('Invalid input data');
      });

      const res = await app.request('/test');

      expect(res.status).toBe(400);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid input data');
    });

    it('returns 400 for ZodError with formatted message', async () => {
      app.get('/test', () => {
        const schema = z.object({
          email: z.string().email(),
          age: z.number().min(18),
        });

        // This will throw ZodError
        schema.parse({ email: 'invalid', age: 10 });
        return null as never; // Unreachable
      });

      const res = await app.request('/test');

      expect(res.status).toBe(400);
      const body = await res.json() as { success: boolean; error: string; details: unknown[] };
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.details).toBeDefined();
    });

    it('includes Zod error details', async () => {
      app.get('/test', () => {
        const schema = z.object({
          username: z.string().min(3),
        });

        schema.parse({ username: 'ab' });
        return null as never; // Unreachable
      });

      const res = await app.request('/test');

      expect(res.status).toBe(400);
      const body = await res.json() as { details: unknown[] };
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
    });
  });

  describe('Authentication Errors', () => {
    it('returns 401 for AuthenticationError', async () => {
      app.get('/test', () => {
        throw new AuthenticationError('Invalid session');
      });

      const res = await app.request('/test');

      expect(res.status).toBe(401);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('session has expired');
    });

    it('provides user-friendly message for authentication errors', async () => {
      app.get('/test', () => {
        throw new AuthenticationError('Technical auth error');
      });

      const res = await app.request('/test');

      const body = await res.json() as { error: string };
      // Should not expose technical details
      expect(body.error).not.toContain('Technical');
      expect(body.error).toContain('log in again');
    });
  });

  describe('Not Found Errors', () => {
    it('returns 404 for NotFoundError', async () => {
      app.get('/test', () => {
        throw new NotFoundError('Resource not found');
      });

      const res = await app.request('/test');

      expect(res.status).toBe(404);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toBe('Resource not found');
    });
  });

  describe('Database Errors', () => {
    it('returns 500 for DatabaseError', async () => {
      app.get('/test', () => {
        throw new DatabaseError('Connection failed');
      });

      const res = await app.request('/test');

      expect(res.status).toBe(500);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('Database operation failed');
    });

    it('provides generic message for database errors', async () => {
      app.get('/test', () => {
        throw new DatabaseError('SELECT * FROM users WHERE id = $1 -- sensitive query');
      });

      const res = await app.request('/test');

      const body = await res.json() as { error: string };
      // Should not expose database details
      expect(body.error).not.toContain('SELECT');
      expect(body.error).toContain('try again later');
    });
  });

  describe('API Errors', () => {
    it('returns correct status code for ApiError', async () => {
      app.get('/test', () => {
        throw new ApiError('Bad Request', 400);
      });

      const res = await app.request('/test');

      expect(res.status).toBe(400);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toBe('Bad Request');
    });

    it('includes details when provided', async () => {
      app.get('/test', () => {
        const details = JSON.stringify({ fields: ['email', 'username'] });
        throw new ApiError('Validation failed', 400, details);
      });

      const res = await app.request('/test');

      const body = await res.json() as { details: string };
      expect(body.details).toBeDefined();
      const parsedDetails = JSON.parse(body.details);
      expect(parsedDetails.fields).toEqual(['email', 'username']);
    });

    it('defaults to 500 for invalid status codes', async () => {
      app.get('/test', () => {
        throw new ApiError('Error', 999); // Invalid status code
      });

      const res = await app.request('/test');

      expect(res.status).toBe(500);
    });

    it('handles various valid status codes', async () => {
      const statusCodes = [400, 401, 403, 404, 500, 503];

      for (const code of statusCodes) {
        const testApp = new Hono();
        testApp.onError(errorHandler);
        testApp.get('/test', () => {
          throw new ApiError(`Error ${code}`, code);
        });

        const res = await testApp.request('/test');
        expect(res.status).toBe(code);
      }
    });
  });

  describe('Generic Errors', () => {
    it('returns 500 for generic Error', async () => {
      app.get('/test', () => {
        throw new Error('Something went wrong');
      });

      const res = await app.request('/test');

      expect(res.status).toBe(500);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('try again later');
    });

    it('provides generic message for unknown errors', async () => {
      app.get('/test', () => {
        throw new Error('Internal server error with sensitive data');
      });

      const res = await app.request('/test');

      const body = await res.json() as { error: string };
      // Should not expose error details
      expect(body.error).not.toContain('sensitive data');
    });

    it('handles errors without message', async () => {
      app.get('/test', () => {
        throw new Error();
      });

      const res = await app.request('/test');

      expect(res.status).toBe(500);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });

  describe('Error Logging', () => {
    it('logs error details', async () => {
      app.get('/test', () => {
        throw new Error('Test error');
      });

      await app.request('/test');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      expect(logCall[0]).toBe('[ERROR]');
    });

    it('includes request metadata in logs', async () => {
      app.get('/test-path', () => {
        throw new Error('Test error');
      });

      await app.request('/test-path');

      const logCall = consoleErrorSpy.mock.calls[0];
      const logData = logCall[1] as Record<string, unknown>;

      expect(logData).toHaveProperty('timestamp');
      expect(logData).toHaveProperty('path');
      expect(logData.path).toBe('/test-path');
      expect(logData).toHaveProperty('method');
      expect(logData.method).toBe('GET');
    });

    it('includes user DID when authenticated', async () => {
      app.use('*', async (c, next) => {
        (c.set as (key: string, value: unknown) => void)('did', 'did:plc:test123');
        await next();
      });

      app.get('/test', () => {
        throw new Error('Test error');
      });

      await app.request('/test');

      const logCall = consoleErrorSpy.mock.calls[0];
      const logData = logCall[1] as Record<string, unknown>;

      expect(logData.userDid).toBe('did:plc:test123');
    });

    it('logs "unauthenticated" when no user DID', async () => {
      app.get('/test', () => {
        throw new Error('Test error');
      });

      await app.request('/test');

      const logCall = consoleErrorSpy.mock.calls[0];
      const logData = logCall[1] as Record<string, unknown>;

      expect(logData.userDid).toBe('unauthenticated');
    });

    it('includes error stack trace', async () => {
      app.get('/test', () => {
        throw new Error('Test error');
      });

      await app.request('/test');

      const logCall = consoleErrorSpy.mock.calls[0];
      const logData = logCall[1] as Record<string, unknown>;

      expect(logData.stack).toBeDefined();
      expect(typeof logData.stack).toBe('string');
    });
  });

  describe('Error Response Format', () => {
    it('always includes success: false', async () => {
      app.get('/validation', () => {
        throw new ValidationError('Test');
      });
      app.get('/auth', () => {
        throw new AuthenticationError('Test');
      });
      app.get('/generic', () => {
        throw new Error('Test');
      });

      const endpoints = ['/validation', '/auth', '/generic'];

      for (const endpoint of endpoints) {
        const res = await app.request(endpoint);
        const body = await res.json() as { success: boolean };
        expect(body.success).toBe(false);
      }
    });

    it('always includes error message', async () => {
      app.get('/test', () => {
        throw new Error('Test error');
      });

      const res = await app.request('/test');
      const body = await res.json() as { error: string };

      expect(body.error).toBeDefined();
      expect(typeof body.error).toBe('string');
      expect(body.error.length).toBeGreaterThan(0);
    });

    it('returns valid JSON even for malformed errors', async () => {
      app.get('/test', () => {
        const err = new Error('Test');
        // @ts-expect-error - Testing malformed error
        err.statusCode = 'not-a-number';
        throw err;
      });

      const res = await app.request('/test');

      expect(res.headers.get('content-type')).toContain('application/json');
      const body = await res.json() as Record<string, unknown>;
      expect(body).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles null errors', async () => {
      app.get('/test', () => {
        // Testing null throw - Hono propagates non-Error values as-is
        throw null; // eslint-disable-line @typescript-eslint/no-throw-literal
      });

      // Hono doesn't catch non-Error throws, so request() rejects
      try {
        await app.request('/test');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeNull();
      }
    });

    it('handles errors thrown during error handling', async () => {
      // Meta-test: what if error handler itself throws?
      const badErrorHandler = (err: Error, c: Context) => {
        throw new Error('Error handler error');
      };

      const testApp = new Hono();
      testApp.onError(badErrorHandler);
      testApp.get('/test', () => {
        throw new Error('Original error');
      });

      // Hono propagates error handler failures, so request() rejects
      try {
        await testApp.request('/test');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe('Error handler error');
      }
    });

    it('handles circular references in error details', async () => {
      app.get('/test', () => {
        // Try to create a circular JSON string (will throw, which is expected)
        try {
          const circular: Record<string, unknown> = {};
          circular.self = circular;
          JSON.stringify(circular); // This will throw
        } catch {
          // If stringify fails, pass a string instead
          throw new ApiError('Circular error', 500, 'details-with-circular-ref');
        }
        return null as never; // Unreachable
      });

      const res = await app.request('/test');

      expect(res.status).toBe(500);
      // Should not throw during JSON serialization
      const body = await res.json() as Record<string, unknown>;
      expect(body).toBeDefined();
    });
  });
});
