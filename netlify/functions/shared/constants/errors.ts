export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = "Authentication required", details?: string) {
    super(message, 401, details);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: string) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found", details?: string) {
    super(message, 404, details);
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = "Database operation failed", details?: string) {
    super(message, 500, details);
    this.name = "DatabaseError";
  }
}

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
