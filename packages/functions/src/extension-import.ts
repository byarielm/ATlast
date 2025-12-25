import type { Handler, HandlerEvent } from '@netlify/functions';
import type { ExtensionImportRequest, ExtensionImportResponse } from '@atlast/shared';
import { z } from 'zod';
import crypto from 'crypto';

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
 * Simple in-memory store for extension imports
 * TODO: Move to database for production
 */
const importStore = new Map<string, ExtensionImportRequest>();

/**
 * Generate a random import ID
 */
function generateImportId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Store import data and return import ID
 */
function storeImport(data: ExtensionImportRequest): string {
  const importId = generateImportId();
  importStore.set(importId, data);

  // Auto-expire after 1 hour
  setTimeout(() => {
    importStore.delete(importId);
  }, 60 * 60 * 1000);

  return importId;
}

/**
 * Extension import endpoint
 * POST /extension-import
 */
export const handler: Handler = async (event: HandlerEvent) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*', // TODO: Restrict in production
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = ExtensionImportSchema.parse(body);

    console.log('[extension-import] Received import:', {
      platform: validatedData.platform,
      usernameCount: validatedData.usernames.length,
      pageType: validatedData.metadata.pageType,
      extensionVersion: validatedData.metadata.extensionVersion
    });

    // Store the import data
    const importId = storeImport(validatedData);

    // Get base URL from event (handles local and production)
    const baseUrl = event.headers.host?.includes('localhost') || event.headers.host?.includes('127.0.0.1')
      ? `http://${event.headers.host}`
      : `https://${event.headers.host}`;

    const redirectUrl = `${baseUrl}/import/${importId}`;

    // Return response
    const response: ExtensionImportResponse = {
      importId,
      usernameCount: validatedData.usernames.length,
      redirectUrl
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('[extension-import] Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Validation error',
          details: error.errors
        }),
      };
    }

    // Handle other errors
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

/**
 * Get import endpoint (helper for import page)
 * GET /extension-import/:id
 */
export function getImport(importId: string): ExtensionImportRequest | null {
  return importStore.get(importId) || null;
}
