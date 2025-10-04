import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { stateStore, sessionStore } from './oauth-stores-db';
import { getOAuthConfig } from './oauth-config';
import { initDB } from './db';

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
    // Initialize database
    await initDB();

    // Parse optional login_hint safely
    let loginHint: string | undefined = undefined;
    if (event.body) {
      const parsed: OAuthStartRequestBody = JSON.parse(event.body);
      loginHint = parsed.login_hint;
    }

    // Validate private key
    const privateKeyEnv = process.env.OAUTH_PRIVATE_KEY;
    if (!privateKeyEnv) {
      console.error('OAUTH_PRIVATE_KEY not set');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const config = getOAuthConfig();

    const normalizedKey = normalizePrivateKey(privateKeyEnv);
    const privateKey = await JoseKey.fromImportable(normalizedKey, 'main-key');

    // Initialize NodeOAuthClient with typed stores
    const client = new NodeOAuthClient({
      clientMetadata: {
        client_id: config.clientId,
        jwks_uri: config.jwksUri,
        redirect_uris: [config.redirectUri], // required by TS
      },
      keyset: [privateKey],
      stateStore: stateStore as any,
      sessionStore: sessionStore as any,
    });

    // Generate authorization URL
    const authUrl = await client.authorize({
      scope: 'atproto transition:generic',
      login_hint: loginHint,
    } as any); // cast to satisfy TS

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
      body: JSON.stringify({
        error: 'Failed to start OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
