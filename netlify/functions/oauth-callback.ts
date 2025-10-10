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
  try {
    const params = new URLSearchParams(event.rawUrl.split('?')[1] || '');
    const code = params.get('code');
    const state = params.get('state');
    const iss = params.get('iss');

    console.log('OAuth callback running with baseUrl:', process.env.DEPLOY_PRIME_URL || process.env.URL);

    if (!code || !state) {
      const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
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
      const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
      return {
        statusCode: 302,
        headers: {
          'Location': `${baseUrl}/?error=Server configuration error`
        },
        body: ''
      };
    }

    // Initialize OAuth client
    const config = getOAuthConfig();
    const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
    const privateKey = await JoseKey.fromImportable(normalizedKey, 'main-key');

    const client = new NodeOAuthClient({
      clientMetadata: {
        client_id: config.clientId,
        client_name: 'ATlast',
        client_uri: config.clientId.replace('/client-metadata', ''),
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

    const result = await client.callback(params);

    // Store a simple session mapping: sessionId -> DID
    // The OAuth client already stored the full session in sessionStore
    const sessionId = crypto.randomUUID();
    const did = result.session.did;

    await userSessions.set(sessionId, { did });

    const baseUrl = process.env.URL || 'https://atlast.byarielm.fyi';
    
    // Determine if the 'Secure' flag should be set for the cookie
    // Use 'Secure' in production (HTTPS) and omit it for local http:// development
    const isSecure = baseUrl.startsWith('https');
    const cookieFlags = 'HttpOnly; SameSite=Lax; Max-Age=86400; Path=/; Secure';
    
    return {
      statusCode: 302,
      headers: {
        'Location': `${baseUrl}/?session=${sessionId}`,
        'Set-Cookie': `atlast_session=${sessionId}; ${cookieFlags}`
      },
      body: ''
    };

  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    return {
      statusCode: 302,
      headers: {
        'Location': `${baseUrl}/?error=OAuth failed`
      },
      body: ''
    };
  }
};