import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { userSessions } from './oauth-stores-db';
import { getDbClient } from './db';
import cookie from 'cookie';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const uploadId = event.queryStringParameters?.uploadId;
    const page = parseInt(event.queryStringParameters?.page || '1');
    const pageSize = Math.min(
      parseInt(event.queryStringParameters?.pageSize || String(DEFAULT_PAGE_SIZE)),
      MAX_PAGE_SIZE
    );

    if (!uploadId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'uploadId is required' }),
      };
    }

    if (page < 1 || pageSize < 1) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid page or pageSize parameters' }),
      };
    }

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

    // Verify upload belongs to user and get total count
    const uploadCheck = await sql`
      SELECT upload_id, total_users FROM user_uploads
      WHERE upload_id = ${uploadId} AND did = ${userSession.did}
    `;

    if ((uploadCheck as any[]).length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Upload not found' }),
      };
    }

    const totalUsers = (uploadCheck as any[])[0].total_users;
    const totalPages = Math.ceil(totalUsers / pageSize);
    const offset = (page - 1) * pageSize;

    // Fetch paginated results with optimized query
    const results = await sql`
      SELECT 
        sa.source_username,
        sa.normalized_username,
        usf.source_date,
        am.atproto_did,
        am.atproto_handle,
        am.atproto_display_name,
        am.atproto_avatar,
        am.match_score,
        ums.followed,
        ums.dismissed
      FROM user_source_follows usf
      JOIN source_accounts sa ON usf.source_account_id = sa.id
      LEFT JOIN atproto_matches am ON sa.id = am.source_account_id
      LEFT JOIN user_match_status ums ON am.id = ums.atproto_match_id AND ums.did = ${userSession.did}
      WHERE usf.upload_id = ${uploadId}
      ORDER BY sa.source_username
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    // Group results by source username
    const groupedResults: any = {};
    
    (results as any[]).forEach((row: any) => {
      const username = row.source_username;
      
      if (!groupedResults[username]) {
        groupedResults[username] = {
          tiktokUser: {
            username: username,
            date: row.source_date || '',
          },
          atprotoMatches: [],
        };
      }
      
      if (row.atproto_did) {
        groupedResults[username].atprotoMatches.push({
          did: row.atproto_did,
          handle: row.atproto_handle,
          displayName: row.atproto_display_name,
          avatar: row.atproto_avatar,
          matchScore: row.match_score,
          followed: row.followed || false,
          dismissed: row.dismissed || false,
        });
      }
    });

    const searchResults = Object.values(groupedResults);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=600', // 10 minute browser cache
      },
      body: JSON.stringify({ 
        results: searchResults,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }),
    };

  } catch (error) {
    console.error('Get upload details error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to fetch upload details',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};