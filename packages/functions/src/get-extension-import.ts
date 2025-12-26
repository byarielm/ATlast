import type { Handler, HandlerEvent } from '@netlify/functions';
import type { ExtensionImportRequest } from '@atlast/shared';
import { getImport } from './utils/import-store.js';

/**
 * Get extension import by ID
 * GET /get-extension-import?importId=xxx
 */
export const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get import ID from query params
    const importId = event.queryStringParameters?.importId;

    if (!importId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing importId parameter' }),
      };
    }

    // Get import data from shared store
    const importData = getImport(importId);

    if (!importData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Import not found or expired' }),
      };
    }

    // Return import data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(importData),
    };
  } catch (error) {
    console.error('[get-extension-import] Error:', error);

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
 * NOTE: This is a temporary implementation using in-memory storage.
 * In production, both extension-import.ts and this function would share
 * the same database for storing and retrieving imports.
 *
 * Suggested production implementation:
 * - Add extension_imports table to database
 * - Store: platform, usernames (JSON), metadata (JSON), created_at, expires_at
 * - Index on import_id for fast lookups
 * - Auto-expire using database TTL or cron job
 */
