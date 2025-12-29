import { SimpleHandler } from "./core/types/api.types";
import { successResponse } from "./utils";
import { withErrorHandling } from "./core/middleware";

/**
 * Health check endpoint
 * Returns 200 OK with server status
 */
const healthHandler: SimpleHandler = async (event) => {
  return successResponse(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    200,
    {},
    event
  );
};

export const handler = withErrorHandling(healthHandler);
