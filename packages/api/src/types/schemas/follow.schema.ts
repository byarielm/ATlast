/**
 * Follow Response Schemas
 * Validates POST /api/follow/batch-follow-users and POST /api/follow/check-status responses
 */

import { z } from 'zod';
import { BaseSuccessSchema, ErrorResponseSchema } from './common.schema';

/** Individual follow result entry */
export const FollowResultEntrySchema = z.object({
  did: z.string(),
  success: z.boolean(),
  alreadyFollowing: z.boolean(),
  error: z.string().nullable(),
});

/** Successful batch follow response */
export const BatchFollowSuccessSchema = BaseSuccessSchema.extend({
  data: z.object({
    total: z.number().int().min(0),
    succeeded: z.number().int().min(0),
    failed: z.number().int().min(0),
    alreadyFollowing: z.number().int().min(0),
    results: z.array(FollowResultEntrySchema),
  }),
});

/** Successful check-status response */
export const CheckStatusSuccessSchema = BaseSuccessSchema.extend({
  data: z.object({
    followStatus: z.record(z.string(), z.boolean()),
  }),
});

/** Validation error response (400) for both endpoints */
export const FollowErrorSchema = ErrorResponseSchema;
