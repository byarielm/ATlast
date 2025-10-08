import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { stateStore, sessionStore, userSessions } from './oauth-stores-db';
import { getOAuthConfig } from './oauth-config';
import { Agent } from '@atproto/api';
import cookie from 'cookie';

function normalizePrivateKey(key: string): string {
  if (!key.includes('\n') && key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  return key;
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    // Get search query
    const query = event.queryStringParameters?.q;
    if (!query) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing query parameter: q' }),
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

    // Initialize OAuth client
    const config = getOAuthConfig();
    const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY!);
    const privateKey = await JoseKey.fromImportable(normalizedKey, 'main-key');

    const client = new NodeOAuthClient({
      clientMetadata: {
        client_id: config.clientId,
        client_name: 'ATlast',
        client_uri: config.clientId.replace('/client-metadata.json', ''),
        redirect_uris: [config.redirectUri],
        scope: 'atproto transition:generic',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        application_type: 'web',
        token_endpoint_auth_method: 'private_key_jwt',
        token_endpoint_auth_signing_alg: 'ES256',
        dpop_bound_access_tokens: true,
        jwks_uri: config.jwksUri,
      },
      keyset: [privateKey],
      stateStore: stateStore as any,
      sessionStore: sessionStore as any,
    });

    // Restore OAuth session
    const oauthSession = await client.restore(userSession.did);
    
    // Create agent from OAuth session
    const agent = new Agent(oauthSession);

    // Search for actors
    const response = await agent.app.bsky.actor.searchActors({
      q: query,
      limit: 20,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        actors: response.data.actors,
      }),
    };

  } catch (error) {
    console.error('Search actors error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to search actors',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};