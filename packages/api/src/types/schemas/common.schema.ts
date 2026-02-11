/**
 * Common Response Schemas
 * Shared schema patterns used across all API endpoints
 */

import { z } from 'zod';

/** Standard error response (400, 401, 500) */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

/** Base success wrapper — all success responses include `success: true` */
export const BaseSuccessSchema = z.object({
  success: z.literal(true),
});
