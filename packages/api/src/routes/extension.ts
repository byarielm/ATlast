/**
 * Extension Import Routes
 * Handles data imports from the browser extension
 */

import { Hono } from 'hono';
import { z } from 'zod';
import crypto from 'crypto';
import { authMiddleware } from '../middleware';
import { UploadRepository, SourceAccountRepository } from '../repositories';
import { ValidationError } from '../errors';
import type { ExtensionImportRequest, ExtensionImportResponse } from '@atlast/shared';
import type { AppEnv } from '../types/hono';

const extension = new Hono<AppEnv>();

/**
 * Validation schema for extension import request
 */
const ExtensionImportSchema = z.object({
  platform: z.string(),
  usernames: z.array(z.string()).min(1).max(10000),
  metadata: z.object({
    extensionVersion: z.string(),
    scrapedAt: z.string(),
    pageType: z.enum(['following', 'followers', 'list']),
    sourceUrl: z.string().url(),
  }),
});

/**
 * POST /api/extension/import
 *
 * Import usernames scraped by the browser extension.
 * Creates an upload record and saves source accounts.
 *
 * @requires authentication
 * @body {ExtensionImportRequest} - Extension data with usernames and metadata
 * @returns {ExtensionImportResponse} - Import ID and redirect URL
 */
extension.post('/import', authMiddleware, async (c) => {
  const did = c.get('did');
  const body = await c.req.json<ExtensionImportRequest>();

  // Validate request
  const validation = ExtensionImportSchema.safeParse(body);
  if (!validation.success) {
    throw new ValidationError(
      'Invalid request. Please provide valid platform, usernames array (1-10000), and metadata.',
    );
  }

  const validatedData = validation.data;

  console.log('[extension-import] Received import:', {
    did,
    platform: validatedData.platform,
    usernameCount: validatedData.usernames.length,
    pageType: validatedData.metadata.pageType,
    extensionVersion: validatedData.metadata.extensionVersion,
  });

  // Generate upload ID
  const uploadId = crypto.randomBytes(16).toString('hex');

  // Create upload and save source accounts
  const uploadRepo = new UploadRepository();
  const sourceAccountRepo = new SourceAccountRepository();

  // Create upload record
  await uploadRepo.createUpload(
    uploadId,
    did,
    validatedData.platform,
    validatedData.usernames.length,
    0, // matchedUsers - will be updated after search
  );

  console.log(`[extension-import] Created upload ${uploadId} for user ${did}`);

  // Save source accounts using bulk insert and link to upload
  try {
    const sourceAccountIdMap = await sourceAccountRepo.bulkCreate(
      validatedData.platform,
      validatedData.usernames,
    );
    console.log(`[extension-import] Saved ${validatedData.usernames.length} source accounts`);

    // Link source accounts to this upload
    const links = Array.from(sourceAccountIdMap.values()).map((sourceAccountId) => ({
      sourceAccountId,
      sourceDate: validatedData.metadata.scrapedAt,
    }));

    await sourceAccountRepo.linkUserToAccounts(uploadId, did, links);
    console.log(`[extension-import] Linked ${links.length} source accounts to upload`);
  } catch (error) {
    console.error('[extension-import] Error saving source accounts:', error);
    // Continue anyway - upload is created, frontend can still search
  }

  // Return upload data for frontend to search
  const response: ExtensionImportResponse = {
    importId: uploadId,
    usernameCount: validatedData.usernames.length,
    redirectUrl: `/?uploadId=${uploadId}`, // Frontend will load results from uploadId param
  };

  return c.json({
    success: true,
    data: response,
  });
});

export default extension;
