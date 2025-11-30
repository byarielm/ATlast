import { OAuthConfig } from "../../types";

export function getOAuthConfig(event?: {
  headers: Record<string, string | undefined>;
}): OAuthConfig {
  let baseUrl: string | undefined;
  let deployContext: string | undefined;

  if (event?.headers) {
    // Get deploy context from Netlify headers
    deployContext = event.headers["x-nf-deploy-context"];

    // For Netlify deploys, construct URL from host header
    const host = event.headers.host;
    const forwardedProto = event.headers["x-forwarded-proto"] || "https";

    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      baseUrl = `${forwardedProto}://${host}`;
    }
  }

  // Fallback to environment variables (prioritize DEPLOY_URL over URL for preview deploys)
  if (!baseUrl) {
    baseUrl = process.env.DEPLOY_URL || process.env.URL;
  }

  console.log("🔍 OAuth Config:", {
    fromHost: event?.headers?.host,
    deployContext: deployContext || process.env.CONTEXT,
    baseUrl,
    envAvailable: {
      DEPLOY_URL: !!process.env.DEPLOY_URL,
      URL: !!process.env.URL,
    },
  });

  // Development: loopback client for local dev
  const isLocalhost =
    !baseUrl || baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (isLocalhost) {
    const port = process.env.PORT || "8888";
    const clientId = `http://localhost?${new URLSearchParams([
      [
        "redirect_uri",
        `http://127.0.0.1:${port}/.netlify/functions/oauth-callback`,
      ],
      ["scope", "atproto transition:generic"],
    ])}`;

    console.log("Using loopback OAuth for local development");

    return {
      clientId: clientId,
      redirectUri: `http://127.0.0.1:${port}/.netlify/functions/oauth-callback`,
      jwksUri: undefined,
      clientType: "loopback",
    };
  }

  // Production/Preview: discoverable client
  if (!baseUrl) {
    throw new Error("No public URL available for OAuth configuration");
  }

  console.log("Using confidential OAuth client for:", baseUrl);

  return {
    clientId: `${baseUrl}/oauth-client-metadata.json`,
    redirectUri: `${baseUrl}/.netlify/functions/oauth-callback`,
    jwksUri: `${baseUrl}/.netlify/functions/jwks`,
    clientType: "discoverable",
    usePrivateKey: true,
  };
}
