import { HandlerResponse } from "@netlify/functions";
import { ApiResponse } from "../core/types";

export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  additionalHeaders: Record<string, string> = {},
): HandlerResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...additionalHeaders,
    },
    body: JSON.stringify(response),
  };
}

export function errorResponse(
  error: string,
  statusCode: number = 500,
  details?: string,
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
      "Access-Control-Allow-Origin": "*",
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
