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
    // The initDB() call is removed here. It should be run manually or as a scheduled function.
    // await initDB(); 
    console.log('OAuth Start - Environment:', {
      URL: process.env.URL,
      DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
      NETLIFY: process.env.NETLIFY,
      hasPrivateKey: !!process.env.OAUTH_PRIVATE_KEY,
      hasDbUrl: !!process.env.NETLIFY_DATABASE_URL
    });

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
    const config = getOAuthConfig();
    const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
    const privateKey = await JoseKey.fromImportable(normalizedKey, 'main-key');

     // CRITICAL: client_id must always be the production URL where metadata is hosted
    // Only redirect_uri changes for preview deploys
    const productionUrl = process.env.URL || 'https://atlast.byarielm.fyi';
    const actualClientId = `${productionUrl}/client-metadata.json`;
    const actualJwksUri = `${productionUrl}/.netlify/functions/jwks`;
    
    // But redirect should go to where the user actually is
    const actualRedirectUri = requestOrigin 
      ? `${requestOrigin}/.netlify/functions/oauth-callback`
      : config.redirectUri;
    
    console.log('OAuth URLs:', {
      clientId: actualClientId,
      redirectUri: actualRedirectUri,
      jwksUri: actualJwksUri,
      requestOrigin
    });

    // DEBUG: Check what the client metadata will contain
    const clientMetadata = {
      client_id: actualClientId,
      client_name: 'ATlast',
      client_uri: productionUrl,
      redirect_uris: [actualRedirectUri],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'web',
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'ES256',
      dpop_bound_access_tokens: true,
      jwks_uri: actualJwksUri,
    };
    
    console.log('Client metadata redirect_uris:', clientMetadata.redirect_uris);
    console.log('Authorizing with redirect_uri:', actualRedirectUri);

    // Initialize NodeOAuthClient with typed stores
    const client = new NodeOAuthClient({
      clientMetadata: {
        client_id: actualClientId,
        client_name: 'ATlast',
        client_uri: productionUrl,
        redirect_uris: [
          'https://atlast.byarielm.fyi/.netlify/functions/oauth-callback',
          'https://*.netlify.app/.netlify/functions/oauth-callback'
        ],
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

    console.log('Attempting authorization with redirect_uri:', actualRedirectUri);

    // Generate authorization URL
    const authUrl = await client.authorize(loginHint, {
      scope: 'atproto transition:generic',
      redirect_uri: actualRedirectUri as `https://${string}`
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