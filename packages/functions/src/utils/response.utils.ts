import { HandlerResponse, HandlerEvent } from "@netlify/functions";
import { ApiResponse } from "../core/types";

/**
 * Get CORS headers based on request origin
 * Supports credentialed requests from extensions and localhost
 */
function getCorsHeaders(event?: HandlerEvent): Record<string, string> {
  const origin = event?.headers?.origin || event?.headers?.Origin;

  // Allow all origins for non-credentialed requests (backward compatibility)
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "*",
    };
  }

  // Check if origin is allowed for credentialed requests
  const allowedOrigins = [
    'http://localhost:8888',
    'http://127.0.0.1:8888',
    'https://atlast.byarielm.fyi',
  ];

  const isExtension = origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');
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

export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  additionalHeaders: Record<string, string> = {},
  event?: HandlerEvent,
): HandlerResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(event),
      ...additionalHeaders,
    },
    body: JSON.stringify(response),
  };
}

export function errorResponse(
  error: string,
  statusCode: number = 500,
  details?: string,
  event?: HandlerEvent,
): HandlerResponse {
  const response: ApiResponse = {
    success: false,
    error,
    details,
  };

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(event),
    },
    body: JSON.stringify(response),
  };
}

export function redirectResponse(
  location: string,
  setCookie?: string,
): HandlerResponse {
  const headers: Record<string, string> = {
    Location: location,
  };

  if (setCookie) {
    headers["Set-Cookie"] = setCookie;
  }

  return {
    statusCode: 302,
    headers,
    body: "",
  };
}
