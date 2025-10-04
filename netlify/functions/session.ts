import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { userSessions } from './oauth-stores-db';

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const sessionId = event.queryStringParameters?.session || 
                     event.headers.cookie?.match(/atlast_session=([^;]+)/)?.[1];

    if (!sessionId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No session' })
      };
    }

    const session = await userSessions.get(sessionId);

    if (!session) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or expired session' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: session.did,
        handle: session.handle,
        serviceEndpoint: session.service_endpoint,
        accessToken: session.access_token
      })
    };

  } catch (error) {
    console.error('Session error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to retrieve session',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};