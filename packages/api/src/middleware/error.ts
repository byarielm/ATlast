import { Context } from "hono";
import {
  ApiError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  DatabaseError,
} from "../errors";

/**
 * Error handler middleware for Hono
 * Translates custom error classes into proper HTTP responses
 * Provides user-friendly messages while logging detailed debug info
 */
export const errorHandler = (err: Error, c: Context) => {
  // Log full error details for debugging
  console.error("[ERROR]", {
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method,
    error: err.message,
    stack: err.stack,
    // Include user DID if available from auth middleware
    userDid: c.get("did") || "unauthenticated",
  });

  // Specific error type handling with user-friendly messages
  if (err instanceof ValidationError) {
    return c.json(
      {
        success: false,
        error: err.message,
      },
      400,
    );
  }

  if (err instanceof AuthenticationError) {
    return c.json(
      {
        success: false,
        error: "Your session has expired. Please log in again.",
      },
      401,
    );
  }

  if (err instanceof NotFoundError) {
    return c.json(
      {
        success: false,
        error: err.message,
      },
      404,
    );
  }

  if (err instanceof DatabaseError) {
    return c.json(
      {
        success: false,
        error: "Database operation failed. Please try again later.",
      },
      500,
    );
  }

  // Handle generic ApiError (custom status codes)
  if (err instanceof ApiError) {
    return c.json(
      {
        success: false,
        error: err.message,
        ...(err.details && { details: err.details }),
      },
      err.statusCode as any,
    );
  }

  // Generic error fallback (unknown errors)
  return c.json(
    {
      success: false,
      error: "Something went wrong. Please try again later.",
    },
    500,
  );
};
