import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { userSessions } from './oauth-stores-db';
import { getDbClient } from './db';
import cookie from 'cookie';

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
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

    const sql = getDbClient();

    // Fetch all uploads for this user
    const uploads = await sql`
      SELECT 
        upload_id,
        source_platform,
        created_at,
        total_users,
        matched_users,
        unmatched_users
      FROM user_uploads
      WHERE did = ${userSession.did}
      ORDER BY created_at DESC
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        uploads: (uploads as any[]).map((upload: any) => ({
          uploadId: upload.upload_id,
          sourcePlatform: upload.source_platform,
          createdAt: upload.created_at,
          totalUsers: upload.total_users,
          matchedUsers: upload.matched_users,
          unmatchedUsers: upload.unmatched_users,
        }))
      }),
    };

  } catch (error) {
    console.error('Get uploads error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to fetch uploads',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};