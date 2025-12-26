import { AuthenticatedHandler } from './core/types';
import type { ExtensionImportRequest, ExtensionImportResponse } from '@atlast/shared';
import { z } from 'zod';
import crypto from 'crypto';
import { withAuthErrorHandling } from './core/middleware';
import { ValidationError } from './core/errors';
import { UploadRepository, SourceAccountRepository } from './repositories';
import { normalize } from './utils/string.utils';
import { successResponse } from './utils';

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
    sourceUrl: z.string().url()
  })
});

/**
 * Extension import endpoint
 * POST /extension-import
 *
 * Requires authentication. Creates upload and saves usernames immediately.
 */
const extensionImportHandler: AuthenticatedHandler = async (context) => {
  const body: ExtensionImportRequest = JSON.parse(context.event.body || '{}');

  // Validate request
  const validatedData = ExtensionImportSchema.parse(body);

  console.log('[extension-import] Received import:', {
    did: context.did,
    platform: validatedData.platform,
    usernameCount: validatedData.usernames.length,
    pageType: validatedData.metadata.pageType,
    extensionVersion: validatedData.metadata.extensionVersion
  });

  // Generate upload ID
  const uploadId = crypto.randomBytes(16).toString('hex');

  // Create upload and save source accounts
  const uploadRepo = new UploadRepository();
  const sourceAccountRepo = new SourceAccountRepository();

  // Create upload record
  await uploadRepo.createUpload(
    uploadId,
    context.did,
    validatedData.platform,
    validatedData.usernames.length,
    0 // matchedUsers - will be updated after search
  );

  console.log(`[extension-import] Created upload ${uploadId} for user ${context.did}`);

  // Save source accounts using bulk insert and link to upload
  try {
    const sourceAccountIdMap = await sourceAccountRepo.bulkCreate(
      validatedData.platform,
      validatedData.usernames
    );
    console.log(`[extension-import] Saved ${validatedData.usernames.length} source accounts`);

    // Link source accounts to this upload
    const links = Array.from(sourceAccountIdMap.values()).map(sourceAccountId => ({
      sourceAccountId,
      sourceDate: validatedData.metadata.scrapedAt
    }));

    await sourceAccountRepo.linkUserToAccounts(uploadId, context.did, links);
    console.log(`[extension-import] Linked ${links.length} source accounts to upload`);
  } catch (error) {
    console.error('[extension-import] Error saving source accounts:', error);
    // Continue anyway - upload is created, frontend can still search
  }

  // Return upload data for frontend to search
  const response: ExtensionImportResponse = {
    importId: uploadId,
    usernameCount: validatedData.usernames.length,
    redirectUrl: `/?uploadId=${uploadId}` // Frontend will load results from uploadId param
  };

  return successResponse(response);
};

export const handler = withAuthErrorHandling(extensionImportHandler);
