import { HandlerEvent, HandlerResponse, Handler } from "@netlify/functions";
import { ApiError } from "../errors";
import { errorResponse } from "../../utils/";
import { SimpleHandler, AuthenticatedHandler } from "../types";

/**
 * Wraps a handler function with standardized error handling
 * Catches all errors and returns appropriate error responses
 **/
export function withErrorHandling(handler: SimpleHandler): Handler {
  return async (event: HandlerEvent): Promise<HandlerResponse> => {
    try {
      return await handler(event);
    } catch (error) {
      console.error("Handler error:", error);

      if (error instanceof ApiError) {
        return errorResponse(error.message, error.statusCode, error.details);
      }

      // Unknown errors
      return errorResponse(
        "Internal server error",
        500,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };
}

/**
 * Wraps an authenticated handler with error handling
 **/
export function withAuthErrorHandling(handler: AuthenticatedHandler): Handler {
  return async (event: HandlerEvent): Promise<HandlerResponse> => {
    try {
      // Import here to avoid circular dependency
      const { authenticateRequest } = await import("./auth.middleware");
      const context = await authenticateRequest(event);
      return await handler(context);
    } catch (error) {
      console.error("Authenticated handler error:", error);

      if (error instanceof ApiError) {
        return errorResponse(error.message, error.statusCode, error.details);
      }

      return errorResponse(
        "Internal server error",
        500,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };
}
