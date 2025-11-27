export function getOAuthConfig() {
  // Check if we have a public URL (production or --live mode)
  const baseUrl =
    process.env.URL || process.env.DEPLOY_URL || process.env.DEPLOY_PRIME_URL;

  // Development: loopback client for local dev
  // Check if we're running on localhost (true local dev)
  const isLocalhost =
    !baseUrl ||
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1") ||
    baseUrl.startsWith("http://localhost") ||
    baseUrl.startsWith("http://127.0.0.1");

  // Use loopback for localhost, production for everything else
  const isDev = isLocalhost;

  if (isDev) {
    const port = process.env.PORT || "8888";

    // Special loopback client_id format with query params
    const clientId = `http://localhost?${new URLSearchParams([
      [
        "redirect_uri",
        `http://127.0.0.1:${port}/.netlify/functions/oauth-callback`,
      ],
      ["scope", "atproto transition:generic"],
    ])}`;

    console.log("Using loopback OAuth for local development");
    console.log("Access your app at: http://127.0.0.1:" + port);

    return {
      clientId: clientId,
      redirectUri: `http://127.0.0.1:${port}/.netlify/functions/oauth-callback`,
      jwksUri: undefined,
      clientType: "loopback" as const,
    };
  }

  // Production: discoverable client logic
  if (!baseUrl) {
    throw new Error("No public URL available");
  }

  console.log("Using confidential OAuth client for production");
  console.log("OAuth Config URLs:", {
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
    URL: process.env.URL,
    CONTEXT: process.env.CONTEXT,
    using: baseUrl,
  });

  return {
    clientId: `${baseUrl}/.netlify/functions/client-metadata`, // discoverable client URL
    redirectUri: `${baseUrl}/.netlify/functions/oauth-callback`,
    jwksUri: `${baseUrl}/.netlify/functions/jwks`,
    clientType: "discoverable" as const,
    usePrivateKey: true,
  };
}
