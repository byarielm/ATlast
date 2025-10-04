import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { stateStore, sessionStore } from './oauth-stores-db';
import { getOAuthConfig } from './oauth-config';
import { initDB } from './db'; // initDB is only kept for manual setup/migrations

interface OAuthStartRequestBody {
  login_hint?: string;
}

function normalizePrivateKey(key: string): string {
  if (!key.includes('\n') && key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  return key;
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    // The initDB() call is removed here. It should be run manually or as a scheduled function.
    // await initDB(); 

    // Parse optional login_hint safely
    let loginHint: string | undefined = undefined;
    if (event.body) {
      const parsed: OAuthStartRequestBody = JSON.parse(event.body);
      loginHint = parsed.login_hint;
    }

    // Validate login hint is provided
    if (!loginHint) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'login_hint (handle or DID) is required' }),
      };
    }

    // Validate private key
    if (!process.env.OAUTH_PRIVATE_KEY) {
      console.error('OAUTH_PRIVATE_KEY not set');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    // Initialize OAuth client
    const config = getOAuthConfig();
    const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
    const privateKey = await JoseKey.fromImportable(normalizedKey, 'main-key');

    // Initialize NodeOAuthClient with typed stores
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

    // Generate authorization URL
    const authUrl = await client.authorize(loginHint, {
      scope: 'atproto transition:generic' // Fixed typo: 'geeric' -> 'generic'
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: authUrl.toString() }),
    };
  } catch (error) {
    console.error('OAuth start error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to start OAuth flow' }),
    };
  }
};