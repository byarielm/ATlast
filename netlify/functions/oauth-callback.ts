import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { stateStore, sessionStore, userSessions } from './oauth-stores-db';
import { getOAuthConfig } from './oauth-config';
import * as crypto from 'crypto';

function normalizePrivateKey(key: string): string {
  if (!key.includes('\n') && key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  return key;
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  let currentHost = process.env.DEPLOY_URL 
    ? new URL(process.env.DEPLOY_URL).host
    : (event.headers['x-forwarded-host'] || event.headers.host);
  let currentUrl = currentHost ? `https://${currentHost}` : process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://atlast.byarielm.fyi'; 
  const fallbackUrl = currentUrl;

  try {
    const params = new URLSearchParams(event.rawUrl.split('?')[1] || '');
    const code = params.get('code');
    const state = params.get('state');

    console.log('OAuth callback - Host:', currentHost);
    console.log('OAuth callback - currentUrl resolved to:', currentUrl);

    if (!code || !state) {
      return {
        statusCode: 302,
        headers: {
          'Location': `${currentUrl}/?error=Missing OAuth parameters`
        },
        body: ''
      };
    }

    if (!process.env.OAUTH_PRIVATE_KEY) {
      console.error('OAUTH_PRIVATE_KEY not set');
      return {
        statusCode: 302,
        headers: {
          'Location': `${currentUrl}/?error=Server configuration error`
        },
        body: ''
      };
    }

    const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
    const privateKey = await JoseKey.fromImportable(normalizedKey, 'main-key');
    
    // All URIs must now be based on the current deploy URL/host
    const redirectUri = `${currentUrl}/.netlify/functions/oauth-callback`;
    const jwksUri = `${currentUrl}/.netlify/functions/jwks`; // NOW DYNAMIC URL
    const clientId = `${currentUrl}/.netlify/functions/client-metadata`; // NOW DYNAMIC URL

    console.log('OAuth callback URLs:', {
      redirectUri,
      jwksUri,
      clientId,
      currentUrl
    });

    // Build metadata dynamically based on the current environment
    const clientMetadata = {
      client_id: clientId, // NOW DYNAMIC URL
      client_name: 'ATlast',
      client_uri: currentUrl,
      redirect_uris: [redirectUri],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'web',
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'ES256',
      dpop_bound_access_tokens: true,
      jwks_uri: jwksUri, // NOW DYNAMIC URL
    };

    // Initialize OAuth client with dynamic metadata
    const client = new NodeOAuthClient({
      clientMetadata: clientMetadata as any,
      keyset: [privateKey],
      stateStore: stateStore as any,
      sessionStore: sessionStore as any,
    });

    const result = await client.callback(params);

    // Store a simple session mapping: sessionId -> DID
    const sessionId = crypto.randomUUID();
    const did = result.session.did;

    await userSessions.set(sessionId, { did });

    const cookieFlags = 'HttpOnly; SameSite=Lax; Max-Age=1209600; Path=/; Secure';
    
    return {
      statusCode: 302,
      headers: {
        'Location': `${currentUrl}/?session=${sessionId}`,
        'Set-Cookie': `atlast_session=${sessionId}; ${cookieFlags}`
      },
      body: ''
    };

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    return {
      statusCode: 302,
      headers: {
        'Location': `${currentUrl}/?error=OAuth failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      body: ''
    };
  }
};