import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { userSessions } from './oauth-stores-db';
import cookie from 'cookie';

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  // Only allow POST for logout
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

    if (sessionId) {
      // Delete session from database
      await userSessions.del(sessionId);
    }

    // Clear the session cookie
    const cookieFlags = 'HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `atlast_session=; ${cookieFlags}`,
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to logout',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};