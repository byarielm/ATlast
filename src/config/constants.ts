export const SEARCH_CONFIG = {
  BATCH_SIZE: 25,
  MAX_MATCHES: 1000,
} as const;

export const FOLLOW_CONFIG = {
  BATCH_SIZE: 50,
} as const;

export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  PROFILE_TTL: 5 * 60 * 1000,
  UPLOAD_LIST_TTL: 2 * 60 * 1000,
  UPLOAD_DETAILS_TTL: 10 * 60 * 1000,
  SEARCH_RESULTS_TTL: 10 * 60 * 1000,
  FOLLOW_STATUS_TTL: 2 * 60 * 1000,
} as const;
