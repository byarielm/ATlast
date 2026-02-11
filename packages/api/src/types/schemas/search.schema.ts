/**
 * Search Response Schemas
 * Validates POST /api/search/batch-search-actors responses
 */

import { z } from 'zod';
import { BaseSuccessSchema, ErrorResponseSchema } from './common.schema';

/** Individual actor returned in search results */
export const EnrichedActorSchema = z.object({
  did: z.string().startsWith('did:'),
  handle: z.string(),
  displayName: z.string().optional(),
  avatar: z.string().optional(),
  description: z.string().optional(),
  matchScore: z.number().min(0).max(100),
  postCount: z.number().min(0),
  followerCount: z.number().min(0),
  followStatus: z.record(z.string(), z.boolean()),
});

/** Per-username result entry */
export const SearchResultEntrySchema = z.object({
  username: z.string(),
  actors: z.array(EnrichedActorSchema),
  error: z.string().nullable(),
});

/** Successful batch search response */
export const BatchSearchSuccessSchema = BaseSuccessSchema.extend({
  data: z.object({
    results: z.array(SearchResultEntrySchema),
  }),
});

/** Validation error response (400) */
export const BatchSearchErrorSchema = ErrorResponseSchema;
