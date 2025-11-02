import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { userSessions } from './oauth-stores-db';
import cookie from 'cookie';
import {
  getOrCreateSourceAccount,
  linkUserToSourceAccount,
  storeAtprotoMatch,
  markSourceAccountMatched,
  createUserMatchStatus,
  createUpload
} from './db-helpers';
import { getDbClient } from './db';

interface SearchResult {
  tiktokUser: {
    username: string;
    date: string;
  };
  atprotoMatches: Array<{
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    matchScore: number;
  }>;
  isSearching?: boolean;
  error?: string;
  selectedMatches?: any;
}

interface SaveResultsRequest {
  uploadId: string;
  sourcePlatform: string;
  results: SearchResult[];
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get session from cookie
    const cookies = event.headers.cookie ? cookie.parse(event.headers.cookie) : {};
    const sessionId = cookies.atlast_session;

    if (!sessionId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No session cookie' }),
      };
    }

    // Get DID from session
    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or expired session' }),
      };
    }

    // Parse request body
    const body: SaveResultsRequest = JSON.parse(event.body || '{}');
    const { uploadId, sourcePlatform, results } = body;

    if (!uploadId || !sourcePlatform || !Array.isArray(results)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'uploadId, sourcePlatform, and results are required' }),
      };
    }

    const sql = getDbClient();
    let matchedCount = 0;

    // IMPORTANT: Create upload record FIRST before processing results
    // This is required because user_source_follows has a foreign key to user_uploads
    await createUpload(
      uploadId,
      userSession.did,
      sourcePlatform,
      results.length,
      0 // We'll update this after processing
    );

    // Process all results
    for (const result of results) {
      try {

        // 1. Get or create source account (handles race conditions)
        const sourceAccountId = await getOrCreateSourceAccount(
          sourcePlatform,
          result.tiktokUser.username
        );

        // 2. Link this user to the source account
        await linkUserToSourceAccount(
          uploadId,
          userSession.did,
          sourceAccountId,
          result.tiktokUser.date
        );

        // 3. If matches found, store them
        if (result.atprotoMatches && result.atprotoMatches.length > 0) {
          matchedCount++;

          // Mark source account as matched
          await markSourceAccountMatched(sourceAccountId);

          // Store each match
          for (const match of result.atprotoMatches) {
            const atprotoMatchId = await storeAtprotoMatch(
              sourceAccountId,
              match.did,
              match.handle,
              match.displayName,
              match.avatar,
              match.matchScore
            );

            // Create user match status (viewed = true since they just searched)
            await createUserMatchStatus(
              userSession.did,
              atprotoMatchId,
              sourceAccountId,
              true
            );
          }
        }
      } catch (error) {
        console.error(`Error processing result for ${result.tiktokUser.username}:`, error);
        // Continue processing other results
      }
    }

    // Update upload record with final counts
    await sql`
      UPDATE user_uploads 
      SET matched_users = ${matchedCount},
          unmatched_users = ${results.length - matchedCount}
      WHERE upload_id = ${uploadId}
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        uploadId,
        totalUsers: results.length,
        matchedUsers: matchedCount,
        unmatchedUsers: results.length - matchedCount
      }),
    };

  } catch (error) {
    console.error('Save results error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to save results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};