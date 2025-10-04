export function getOAuthConfig() {
  // Use 'http://localhost:8888' as a local development default.
  // In Netlify, process.env.URL is automatically set to the public URL.
  const baseUrl = process.env.URL || 'http://localhost:8888';
  
  if (process.env.NETLIFY && !process.env.URL) {
      // This is a safety check for a critical configuration issue on Netlify
      throw new Error('process.env.URL is required in Netlify environment');
  }

  const redirectUri = `${baseUrl}/oauth/callback`;

  return {
    clientId: `${baseUrl}/client-metadata.json`, // discoverable client URL
    redirectUri,
    jwksUri: `${baseUrl}/.netlify/functions/jwks`,
    clientType: 'discoverable' as const,
  };
}