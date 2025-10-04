import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { stateStore, sessionStore } from './oauth-stores-db';
import { getOAuthConfig } from './oauth-config';
import { initDB } from './db';

function normalizePrivateKey(key: string): string {
  if (!key.includes('\n') && key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  return key;
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    // Initialize DB on first call
    await initDB();

    const { handle } = JSON.parse(event.body || '{}');

    if (!handle) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Handle required' })
      };
    }

    if (!process.env.OAUTH_PRIVATE_KEY) {
      console.error('OAUTH_PRIVATE_KEY not set');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const config = getOAuthConfig();
    console.log('OAuth config:', { 
      clientType: config.clientType,
      clientId: config.clientId 
    });

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

    const authUrl = await client.authorize(handle, {
      scope: 'atproto transition:generic',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: authUrl.toString() })
    };

  } catch (error) {
    console.error('OAuth start error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to start OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};