export * from "./ApiError";
export * from "./AuthenticationError";
export * from "./ValidationError";
export * from "./NotFoundError";
export * from "./DatabaseError";

export const ERROR_MESSAGES = {
  NO_SESSION_COOKIE: "No session cookie",
  INVALID_SESSION: "Invalid or expired session",
  MISSING_PARAMETERS: "Missing required parameters",
  OAUTH_FAILED: "OAuth authentication failed",
  DATABASE_ERROR: "Database operation failed",
  PROFILE_FETCH_FAILED: "Failed to fetch profile",
  SEARCH_FAILED: "Search operation failed",
  FOLLOW_FAILED: "Follow operation failed",
  SAVE_FAILED: "Failed to save results",
} as const;
