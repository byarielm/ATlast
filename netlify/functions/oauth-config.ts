export function getOAuthConfig() {
  const baseUrl = process.env.URL || 'https://atlast.byarielm.fyi';
  const redirectUri = `${baseUrl}/oauth/callback`;

  return {
    clientId: `${baseUrl}/client-metadata.json`, // discoverable client URL
    redirectUri,
    jwksUri: `${baseUrl}/.netlify/functions/jwks`,
    clientType: 'discoverable' as const,
  };
}