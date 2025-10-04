export function getOAuthConfig() {
  const isProduction = process.env.CONTEXT === 'production' || 
                       process.env.URL?.includes('netlify.app');
  
  const baseUrl = process.env.URL || 'http://localhost:8888';
  
  if (isProduction) {
    // DISCOVERABLE CLIENT for production
    return {
      clientId: `${baseUrl}/client-metadata.json`,
      redirectUri: `${baseUrl}/oauth/callback`,
      jwksUri: `${baseUrl}/.netlify/functions/jwks`,
      clientType: 'discoverable' as const
    };
  } else {
    // LOOPBACK CLIENT for local development
    const redirectUri = `${baseUrl}/oauth/callback`;
    const scope = 'atproto transition:generic';
    
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      scope: scope,
      grant_types: 'authorization_code refresh_token',
      response_types: 'code',
      token_endpoint_auth_method: 'private_key_jwt',
    });
    
    return {
      clientId: `${baseUrl}?${params.toString()}`,
      redirectUri: redirectUri,
      jwksUri: `${baseUrl}/.netlify/functions/jwks`,
      clientType: 'loopback' as const
    };
  }
}