export const CONFIG = {
  PROFILE_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  SESSION_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days
  STATE_EXPIRY: 10 * 60 * 1000, // 10 minutes
  COOKIE_MAX_AGE: 2592000, // 30 days in seconds,
  OAUTH_KEY_ID: "main-key", // jwks kid
  OAUTH_SCOPES: "atproto transition:generic", // future?: atproto rpc:app.bsky.graph.getFollows?aud=* rpc:app.bsky.actor.getProfile?aud=* repo:app.bsky.graph.follow?action=create repo:so.sprk.graph.follow?action=create repo:sh.tangled.graph.follow?action=create
} as const;
