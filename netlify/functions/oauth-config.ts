export function getOAuthConfig() {
  // Development: loopback client for local dev
  const isDev = process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true';

  if (isDev) {
    const port = process.env.PORT || '8888';

    // Special loopback client_id format with query params
    const clientId = `http://localhost?${new URLSearchParams([
      ['redirect_uri', `http://127.0.0.1:${port}/.netlify/functions/oauth-callback`],
      ['scope', 'atproto transition:generic'],
    ])}`;
    
    return {
      clientId: clientId,
      redirectUri: `http://127.0.0.1:${port}/.netlify/functions/oauth-callback`,
      jwksUri: undefined,
      clientType: 'loopback' as const,
    };
  }

  // Production: discoverable client logic
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  
  if (process.env.NETLIFY && !process.env.URL) {
      throw new Error('process.env.URL is required in Netlify environment');
  }
  
  console.log('OAuth Config URLs:', {
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
    URL: process.env.URL,
    CONTEXT: process.env.CONTEXT,
    using: baseUrl
  });

  return {
    clientId: `${baseUrl}/.netlify/functions/client-metadata`, // discoverable client URL
    redirectUri: `${baseUrl}/.netlify/functions/oauth-callback`,
    jwksUri: `${baseUrl}/.netlify/functions/jwks`,
    clientType: 'discoverable' as const,
    usePrivateKey: true,
  };
}