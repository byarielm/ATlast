import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    // Get the host that's requesting the metadata
    // This will be different for production vs preview deploys
    const requestHost = event.headers.host;
    
    if (!requestHost) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing host header' }),
      };
    }

    // Build the redirect URI based on the requesting host
    const redirectUri = `https://${requestHost}/.netlify/functions/oauth-callback`;
    const appUrl = `https://${requestHost}`;
    
    // The jwksUri always points to production (must be publicly accessible and consistent)
    const jwksUri = 'https://atlast.byarielm.fyi/.netlify/functions/jwks';
    
    // The client_id also always points to production
    const clientId = 'https://atlast.byarielm.fyi/.netlify/functions/client-metadata';

    console.log('Client metadata generated for host:', {
      requestHost,
      redirectUri,
      appUrl,
      clientId,
      jwksUri,
    });

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
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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