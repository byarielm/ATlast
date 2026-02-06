/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

import { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (c: Context) => string;
  message?: string;
}

/**
 * Create a rate limit middleware
 *
 * @param options - Rate limit configuration
 * @returns Hono middleware function
 *
 * @example
 * ```ts
 * // 10 requests per minute
 * const searchLimit = rateLimiter({
 *   maxRequests: 10,
 *   windowMs: 60 * 1000,
 *   message: 'Too many search requests. Please try again later.'
 * });
 *
 * app.post('/search', searchLimit, handler);
 * ```
 */
export function rateLimiter(options: RateLimitOptions) {
  const {
    maxRequests,
    windowMs,
    keyGenerator = (c) => {
      // Default: use IP address or session ID
      const sessionId = c.get('sessionId');
      const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      return sessionId || ip;
    },
    message = 'Too many requests. Please try again later.',
  } = options;

  return createMiddleware(async (c, next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      Object.keys(store).forEach((k) => {
        if (store[k].resetTime < now) {
          delete store[k];
        }
      });
    }

    // Initialize or get existing entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment count
    store[key].count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - store[key].count);
    const resetTime = Math.ceil(store[key].resetTime / 1000);

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetTime.toString());

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      c.header('Retry-After', retryAfter.toString());

      return c.json(
        {
          success: false,
          error: message,
          retryAfter,
        },
        429,
      );
    }

    await next();
  });
}

/**
 * Predefined rate limiters for common use cases
 */

// Check if we're in test environment
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

// General API rate limit: 60 requests per minute (1000 in tests)
export const apiRateLimit = rateLimiter({
  maxRequests: isTestEnv ? 1000 : 60,
  windowMs: 60 * 1000,
  message: 'Too many requests. Please try again later.',
});

// Search rate limit: 10 searches per minute (100 in tests)
export const searchRateLimit = rateLimiter({
  maxRequests: isTestEnv ? 100 : 10,
  windowMs: 60 * 1000,
  message: 'Search limit reached. Please wait before searching again.',
});

// Follow rate limit: 100 follows per hour (1000 in tests)
export const followRateLimit = rateLimiter({
  maxRequests: isTestEnv ? 1000 : 100,
  windowMs: 60 * 60 * 1000,
  message: 'Follow limit reached. Please try again later.',
});
