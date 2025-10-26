import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { stateStore, sessionStore } from './oauth-stores-db';
import { getOAuthConfig } from './oauth-config';
import { initDB } from './db'; // initDB is only kept for manual setup/migrations

interface OAuthStartRequestBody {
  login_hint?: string;
  origin?: string; // The actual origin the frontend is running on
}

function normalizePrivateKey(key: string): string {
  if (!key.includes('\n') && key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  return key;
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    // await initDB(); 

    // Parse request body
    let loginHint: string | undefined = undefined;
    let requestOrigin: string | undefined = undefined;
    
    if (event.body) {
      const parsed: OAuthStartRequestBody = JSON.parse(event.body);
      loginHint = parsed.login_hint;
      requestOrigin = parsed.origin;
    }

    // Validate login hint is provided
    if (!loginHint) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'login_hint (handle or DID) is required' }),
      };
    }
    
    console.log('OAuth Start - Request origin:', requestOrigin);

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
    const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
    const privateKey = await JoseKey.fromImportable(normalizedKey, 'main-key');

    // Use the dynamic config that Netlify sets for the build
    const currentHost = process.env.DEPLOY_URL 
      ? new URL(process.env.DEPLOY_URL).host
      : (event.headers['x-forwarded-host'] || event.headers.host);

    if (!currentHost) {
      console.error('Missing host header in function request');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server could not determine current host for redirect' }),
      };
    }

    const currentUrl = `https://${currentHost}`;

    // Now, dynamically define the URIs using the CURRENT HOST
    const redirectUri = `${currentUrl}/.netlify/functions/oauth-callback`;
    const appUrl = currentUrl;
    const jwksUri = `${currentUrl}/.netlify/functions/jwks`;
    const clientId = `${currentUrl}/.netlify/functions/client-metadata`;
    
    console.log('OAuth URLs:', {
      redirectUri,
      appUrl,
      jwksUri,
      clientId,
      requestOrigin
    });

    // Build metadata dynamically from environment
    const clientMetadata = {
      client_id: clientId,
      client_name: 'ATlast',
      client_uri: appUrl,
      redirect_uris: [redirectUri],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'web',
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'ES256',
      dpop_bound_access_tokens: true,
      jwks_uri: jwksUri,
    };

    console.log('Client metadata:', clientMetadata);

    // Initialize NodeOAuthClient with typed stores
    const client = new NodeOAuthClient({
      clientMetadata: clientMetadata as any,
      keyset: [privateKey],
      stateStore: stateStore as any,
      sessionStore: sessionStore as any,
    });

    console.log('OAuth client initialized with redirect_uri:', redirectUri);

    // Generate authorization URL
    const authUrl = await client.authorize(loginHint, {
      scope: 'atproto transition:generic',
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