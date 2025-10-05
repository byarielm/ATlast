import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { userSessions } from './oauth-stores-db';
import cookie from 'cookie';

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const cookies = event.headers.cookie ? cookie.parse(event.headers.cookie) : {};
    const sessionId = event.queryStringParameters?.session || cookies.atlast_session;

    if (!sessionId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No session' }),
      };
    }

    // Get the DID from our simple session store
    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or expired session' }),
      };
    }

    // For now, return minimal info
    // The OAuth client manages the actual tokens in sessionStore
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        did: userSession.did,
        // We'll add handle and serviceEndpoint in the next phase
        // when we can restore the OAuth session
      }),
    };
  } catch (error) {
    console.error('Session error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};