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
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const dids: string[] = body.dids || [];

    if (!Array.isArray(dids) || dids.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'dids array is required and must not be empty' }),
      };
    }

    // Limit batch size to prevent timeouts and respect rate limits
    if (dids.length > 100) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Maximum 100 DIDs per batch' }),
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

    // Follow all users
    const results = [];
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    
    for (const did of dids) {
      try {
        await agent.api.com.atproto.repo.createRecord({
          repo: userSession.did,
          collection: 'app.bsky.graph.follow',
          record: {
            $type: 'app.bsky.graph.follow',
            subject: did,
            createdAt: new Date().toISOString(),
          },
        });
        
        results.push({
          did,
          success: true,
          error: null
        });
        
        // Reset error counter on success
        consecutiveErrors = 0;
      } catch (error) {
        consecutiveErrors++;
        
        results.push({
          did,
          success: false,
          error: error instanceof Error ? error.message : 'Follow failed'
        });
        
        // If we hit rate limits, implement exponential backoff
        if (error instanceof Error && 
            (error.message.includes('rate limit') || error.message.includes('429'))) {
          const backoffDelay = Math.min(200 * Math.pow(2, consecutiveErrors), 2000);
          console.log(`Rate limit hit. Backing off for ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          // For other repeated errors, small backoff
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        total: dids.length,
        succeeded: successCount,
        failed: failCount,
        results
      }),
    };

  } catch (error) {
    console.error('Batch follow error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to follow users',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};