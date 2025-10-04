import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { userSessions } from './oauth-stores-db';
import cookie from 'cookie';

interface UserSession {
  did: string;
  handle: string;
  service_endpoint: string;
  // access_token removed for security: it should not be stored in the public user session.
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const cookies = event.headers.cookie ? cookie.parse(event.headers.cookie) : {};
    const sessionId =
      event.queryStringParameters?.session || cookies.atlast_session;

    if (!sessionId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No session' }),
      };
    }

    const session = (await userSessions.get(sessionId)) as UserSession | undefined;

    if (!session) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or expired session' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // optional
      },
      body: JSON.stringify({
        did: session.did,
        handle: session.handle,
        serviceEndpoint: session.service_endpoint,
        // accessToken: session.access_token, // ❌ omit for security
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