/**
 * Response utilities for Hono API
 * Provides consistent JSON response formatting
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * Get CORS headers based on request origin
 * Supports credentialed requests from extensions and localhost
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  // Allow all origins for non-credentialed requests (backward compatibility)
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "*",
    };
  }

  // Check if origin is allowed for credentialed requests
  const allowedOrigins = [
    "http://localhost:8888",
    "http://127.0.0.1:8888",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://atlast.byarielm.fyi",
  ];

  const isExtension =
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://");
  const isAllowedOrigin = allowedOrigins.includes(origin);

  if (isExtension || isAllowedOrigin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // Default to wildcard for unknown origins
  return {
    "Access-Control-Allow-Origin": "*",
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string,
  details?: string,
): ApiResponse {
  return {
    success: false,
    error,
    details,
  };
}
