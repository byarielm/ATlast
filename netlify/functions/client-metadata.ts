import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {

  try {
    // Get the host that's requesting the metadata
    // This will be different for production vs preview deploys vs dev --live
    const requestHost = process.env.DEPLOY_URL 
    ? new URL(process.env.DEPLOY_URL).host
    : (event.headers['x-forwarded-host'] || event.headers.host);
    
    if (!requestHost) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing host header' }),
      };
    }

     // Check if this is a loopback/development request
    const isLoopback = requestHost.startsWith('127.0.0.1') || 
                       requestHost.startsWith('[::1]') ||
                       requestHost === 'localhost';

    if (isLoopback) {
      // For loopback clients, return minimal metadata
      // NOTE: In practice, the OAuth server won't fetch this because
      // loopback clients use hardcoded metadata on the server side
      const appUrl = `http://${requestHost}`;
      const redirectUri = `${appUrl}/.netlify/functions/oauth-callback`;
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          client_id: appUrl, // Just the origin for loopback
          client_name: 'ATlast (Local Dev)',
          client_uri: appUrl,
          redirect_uris: [redirectUri],
          scope: 'atproto transition:generic',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          application_type: 'web',
          token_endpoint_auth_method: 'none', // No auth for loopback
          dpop_bound_access_tokens: true,
        }),
      };
    }

    // Production: Confidential client metadata
    const redirectUri = `https://${requestHost}/.netlify/functions/oauth-callback`;
    const appUrl = `https://${requestHost}`;
    const jwksUri = `https://${requestHost}/.netlify/functions/jwks`;
    const clientId = `https://${requestHost}/.netlify/functions/client-metadata`;

    const metadata = {
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify(metadata),
    };
  } catch (error) {
    console.error('Client metadata error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};