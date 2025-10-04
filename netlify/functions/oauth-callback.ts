import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { stateStore, sessionStore, userSessions } from './oauth-stores-db';
import { getOAuthConfig } from './oauth-config';

function normalizePrivateKey(key: string): string {
  if (!key.includes('\n') && key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  return key;
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const params = new URLSearchParams(event.rawUrl.split('?')[1] || '');
    const code = params.get('code');
    const state = params.get('state');
    const iss = params.get('iss');

    if (!code || !state) {
      const baseUrl = process.env.URL || 'http://localhost:8888';
      return {
        statusCode: 302,
        headers: {
          'Location': `${baseUrl}/?error=Missing OAuth parameters`
        },
        body: ''
      };
    }

    if (!process.env.OAUTH_PRIVATE_KEY) {
      console.error('OAUTH_PRIVATE_KEY not set');
      const baseUrl = process.env.URL || 'http://localhost:8888';
      return {
        statusCode: 302,
        headers: {
          'Location': `${baseUrl}/?error=Server configuration error`
        },
        body: ''
      };
    }

    const config = getOAuthConfig();
    const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
    const privateKey = await JoseKey.fromImportable(normalizedKey, 'main-key');
    
    const client = new NodeOAuthClient({
      clientMetadata: {
        client_id: config.clientId,
        client_name: 'ATlast',
        redirect_uris: [config.redirectUri],
        scope: 'atproto transition:generic',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        application_type: 'web',
        token_endpoint_auth_method: 'private_key_jwt',
        dpop_bound_access_tokens: true,
        jwks_uri: config.jwksUri,
      },
      keyset: [privateKey],
      stateStore: stateStore as any,
      sessionStore: sessionStore as any,
    });

    const result = await client.callback(params);
    
    // Store just the DID - the OAuth client manages tokens via sessionStore
    const sessionId = crypto.randomUUID();
    await userSessions.set(sessionId, {
      did: result.session.sub,
      handle: result.session.sub, // Use DID, can resolve to handle later
      serviceEndpoint: iss || 'https://bsky.social',
      accessToken: result.session.sub, // Store DID as identifier for OAuth client restore
      refreshToken: null,
      tokens: { sub: result.session.sub },
    });

    const baseUrl = process.env.URL || 'http://localhost:8888';
    return {
      statusCode: 302,
      headers: {
        'Location': `${baseUrl}/?session=${sessionId}`,
        'Set-Cookie': `atlast_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`
      },
      body: ''
    };

  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = process.env.URL || 'http://localhost:8888';
    return {
      statusCode: 302,
      headers: {
        'Location': `${baseUrl}/?error=${encodeURIComponent(error instanceof Error ? error.message : 'OAuth failed')}`
      },
      body: ''
    };
  }
};