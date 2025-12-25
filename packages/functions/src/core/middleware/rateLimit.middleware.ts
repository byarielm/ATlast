import { HandlerEvent } from "@netlify/functions";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: (event: HandlerEvent) => string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store per function instance
// Note: Resets on cold starts, but provides basic protection
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 *
 * Limitations:
 * - Per function instance (not shared across instances)
 * - Resets on cold starts
 * - In-memory only
 *
 * For production use with shared state, consider @upstash/ratelimit
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    maxRequests,
    windowMs,
    identifier = (event) => event.headers["x-forwarded-for"] || "unknown",
  } = config;

  return function checkRateLimit(event: HandlerEvent): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
  } {
    const key = identifier(event);
    const now = Date.now();
    const record = rateLimitStore.get(key);

    // No record or window expired - allow and create new record
    if (!record || now > record.resetAt) {
      const resetAt = now + windowMs;
      rateLimitStore.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetAt,
      };
    }

    // Within window - check if under limit
    if (record.count < maxRequests) {
      record.count++;
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - record.count,
        resetAt: record.resetAt,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: record.resetAt,
    };
  };
}

/**
 * Rate limit error response
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public limit: number,
    public resetAt: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Apply rate limiting to a request
 * Throws RateLimitError if limit exceeded
 */
export function applyRateLimit(
  checkRateLimit: ReturnType<typeof createRateLimiter>,
  event: HandlerEvent,
  timeUnit: "seconds" | "minutes" = "seconds",
): void {
  const rateLimit = checkRateLimit(event);

  if (!rateLimit.allowed) {
    const timeRemaining =
      timeUnit === "minutes"
        ? Math.ceil((rateLimit.resetAt - Date.now()) / 60000)
        : Math.ceil((rateLimit.resetAt - Date.now()) / 1000);

    const unitLabel = timeUnit === "minutes" ? "minutes" : "seconds";

    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${timeRemaining} ${unitLabel}.`,
      rateLimit.limit,
      rateLimit.resetAt,
    );
  }
}
