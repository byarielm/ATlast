/**
 * Extension Response Schemas
 * Validates POST /api/extension/import responses
 */

import { z } from 'zod';
import { BaseSuccessSchema } from './common.schema';

/** Extension import data payload */
export const ExtensionImportDataSchema = z.object({
  importId: z.string(),
  usernameCount: z.number().int().min(1),
  redirectUrl: z.string(),
});

/** Successful extension import response */
export const ExtensionImportSuccessSchema = BaseSuccessSchema.extend({
  data: ExtensionImportDataSchema,
});
