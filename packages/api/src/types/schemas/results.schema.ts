/**
 * Results Response Schemas
 * Validates POST /api/results/save, GET /api/results/uploads,
 * and GET /api/results/upload-details responses
 */

import { z } from 'zod';
import { BaseSuccessSchema } from './common.schema';

/** Successful save response */
export const SaveResultsSuccessSchema = BaseSuccessSchema.extend({
  uploadId: z.string(),
  totalUsers: z.number().int().min(0),
  matchedUsers: z.number().int().min(0),
  unmatchedUsers: z.number().int().min(0),
  message: z.string().optional(),
});

/** Single upload entry in uploads list */
export const UploadEntrySchema = z.object({
  uploadId: z.string(),
  sourcePlatform: z.string(),
  createdAt: z.string(),
  totalUsers: z.number().int().min(0),
  matchedUsers: z.number().int().min(0),
  unmatchedUsers: z.number().int().min(0),
});

/** Successful uploads list response */
export const UploadsListSuccessSchema = BaseSuccessSchema.extend({
  data: z.object({
    uploads: z.array(UploadEntrySchema),
  }),
});

/** AT Protocol match in upload details */
export const UploadDetailMatchSchema = z.object({
  did: z.string(),
  handle: z.string(),
  displayName: z.string().nullable(),
  matchScore: z.number().min(0),
  postCount: z.number().nullable(),
  followerCount: z.number().nullable(),
  foundAt: z.string().nullable(),
  dismissed: z.boolean(),
  followStatus: z.record(z.string(), z.unknown()),
});

/** Grouped result entry in upload details */
export const UploadDetailResultSchema = z.object({
  sourceUser: z.object({
    username: z.string(),
    date: z.string(),
  }),
  atprotoMatches: z.array(UploadDetailMatchSchema),
});

/** Pagination metadata */
export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  totalUsers: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

/** Successful upload details response */
export const UploadDetailsSuccessSchema = BaseSuccessSchema.extend({
  data: z.object({
    results: z.array(UploadDetailResultSchema),
    pagination: PaginationSchema,
  }),
});
