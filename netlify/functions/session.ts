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

// In-memory cache for profile data (lives for the function instance lifetime)
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const cookies = event.headers.cookie ? cookie.parse(event.headers.cookie) : {};
    const sessionId = event.queryStringParameters?.session || cookies.atlast_session;

    if (!sessionId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No session' }),
      };
    }

    // Get the DID from our simple session store
    const userSession = await userSessions.get(sessionId);
    if (!userSession) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or expired session' }),
      };
    }

    // Check cache first
    const cached = profileCache.get(userSession.did);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached profile for', userSession.did);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'private, max-age=300', // Browser can cache for 5 minutes
        },
        body: JSON.stringify(cached.data),
      };
    }

    // If not in cache, fetch full profile
    try {
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

      // Get profile
      const profile = await agent.getProfile({ actor: userSession.did });

      const profileData = {
        did: userSession.did,
        handle: profile.data.handle,
        displayName: profile.data.displayName,
        avatar: profile.data.avatar,
        description: profile.data.description,
      };

      // Cache the profile data
      profileCache.set(userSession.did, {
        data: profileData,
        timestamp: Date.now(),
      });

      // Clean up old cache entries (simple cleanup)
      if (profileCache.size > 100) {
        const now = Date.now();
        for (const [did, entry] of profileCache.entries()) {
          if (now - entry.timestamp > CACHE_TTL) {
            profileCache.delete(did);
          }
        }
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'private, max-age=300', // Browser can cache for 5 minutes
        },
        body: JSON.stringify(profileData),
      };
    } catch (error) {
      console.error('Profile fetch error:', error);
      
      // If profile fetch fails, return basic session info
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          did: userSession.did,
          // Profile data unavailable
        }),
      };
    }
  } catch (error) {
    console.error('Session error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};