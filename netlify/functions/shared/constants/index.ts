export * from "./errors";

export const CONFIG = {
  PROFILE_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  SESSION_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days
  STATE_EXPIRY: 10 * 60 * 1000, // 10 minutes
  COOKIE_MAX_AGE: 2592000, // 30 days in seconds
} as const;
