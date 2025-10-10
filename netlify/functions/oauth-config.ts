export function getOAuthConfig() {
  // In Netlify, process.env.URL is automatically set to the public URL.
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  
  if (process.env.NETLIFY && !process.env.URL) {
      // This is a safety check for a critical configuration issue on Netlify
      throw new Error('process.env.URL is required in Netlify environment');
  }
  
  console.log('OAuth Config URLs:', {
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
    URL: process.env.URL,
    CONTEXT: process.env.CONTEXT,
    using: baseUrl
  });

  const redirectUri = `${baseUrl}/.netlify/functions/oauth-callback`;

  return {
    clientId: `${baseUrl}/.netlify/functions/client-metadata`, // discoverable client URL
    redirectUri,
    jwksUri: `${baseUrl}/.netlify/functions/jwks`,
    clientType: 'discoverable' as const,
  };
}