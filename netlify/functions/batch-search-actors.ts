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
    // Parse batch request
    const body = JSON.parse(event.body || '{}');
    const usernames: string[] = body.usernames || [];
    
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'usernames array is required and must not be empty' }),
      };
    }

    // Limit batch size to prevent timeouts
    if (usernames.length > 50) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Maximum 50 usernames per batch' }),
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

    // Search all usernames in parallel
    const searchPromises = usernames.map(async (username) => {
      try {
        const response = await agent.app.bsky.actor.searchActors({
          q: username,
          limit: 20,
        });
        
        // Filter and rank matches (same logic as before)
        const normalize = (s: string) => s.toLowerCase().replace(/[._-]/g, "");
        const normalizedUsername = normalize(username);

        const rankedActors = response.data.actors.map((actor: any) => {
          const handlePart = actor.handle.split('.')[0];
          const normalizedHandle = normalize(handlePart);
          const normalizedFullHandle = normalize(actor.handle);
          const normalizedDisplayName = normalize(actor.displayName || '');

          let score = 0;
          if (normalizedHandle === normalizedUsername) score = 100;
          else if (normalizedFullHandle === normalizedUsername) score = 90;
          else if (normalizedDisplayName === normalizedUsername) score = 80;
          else if (normalizedHandle.includes(normalizedUsername)) score = 60;
          else if (normalizedFullHandle.includes(normalizedUsername)) score = 50;
          else if (normalizedDisplayName.includes(normalizedUsername)) score = 40;
          else if (normalizedUsername.includes(normalizedHandle)) score = 30;

          return { 
            ...actor, 
            matchScore: score,
            postCount: actor.postCount || 0,
            followerCount: actor.followerCount || 0
          };
        })
        .filter((actor: any) => actor.matchScore > 0)
        .sort((a: any, b: any) => b.matchScore - a.matchScore)
        .slice(0, 5);

        return {
          username,
          actors: rankedActors,
          error: null
        };
      } catch (error) {
        return {
          username,
          actors: [],
          error: error instanceof Error ? error.message : 'Search failed'
        };
      }
    });

    const results = await Promise.all(searchPromises);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ results }),
    };

  } catch (error) {
    console.error('Batch search error:', error);
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