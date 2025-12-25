import { OAuthConfig } from "../../core/types";
import { configCache } from "../cache/CacheService";
import { CONFIG } from "../../core/config/constants";

export function getOAuthConfig(event?: {
  headers: Record<string, string | undefined>;
}): OAuthConfig {
  // 1. Determine host dynamically
  const host = event?.headers?.host;
  console.log("[oauth-config] Host from headers:", host);
  console.log("[oauth-config] All relevant headers:", {
    host: event?.headers?.host,
    "x-forwarded-host": event?.headers?.["x-forwarded-host"],
    "x-forwarded-proto": event?.headers?.["x-forwarded-proto"],
    "x-nf-deploy-context": event?.headers?.["x-nf-deploy-context"],
  });

  const cacheKey = `oauth-config-${host || "default"}`;
  const cached = configCache.get(cacheKey) as OAuthConfig | undefined;
  if (cached) {
    return cached;
  }

  let baseUrl: string | undefined;

  // 2. Check if we're in Netlify Live mode (--live)
  // In --live mode, DEPLOY_URL will be the tunnel URL even though host header is localhost
  const deployUrl = process.env.DEPLOY_URL || process.env.URL;
  const isNetlifyLive = deployUrl?.includes(".netlify.live");

  // 3. Determine if local based on host header AND not in live mode
  const isLocal =
    !isNetlifyLive &&
    (!host || host.includes("localhost") || host.includes("127.0.0.1"));

  // 3. Local oauth config
  if (isLocal) {
    const currentHost = host || "localhost:8888";
    const protocol = currentHost.includes("127.0.0.1")
      ? "http://127.0.0.1"
      : "http://localhost";

    // Redirect URI must use host in address bar
    const redirectUri = `${protocol}:${currentHost.split(":")[1] || "8888"}/.netlify/functions/oauth-callback`;

    // ClientID must start with localhost
    // but redirect_uri query inside must match actual redirectUri
    const clientId = `http://localhost?${new URLSearchParams([
      ["redirect_uri", redirectUri],
      ["scope", CONFIG.OAUTH_SCOPES],
    ])}`;

    console.log("Using loopback OAuth for local development");

    const config: OAuthConfig = {
      clientId: clientId,
      redirectUri: redirectUri,
      jwksUri: undefined,
      clientType: "loopback",
    };

    configCache.set(cacheKey, config, 300000);
    return config;
  }

  // 4. Production + Live oauth config
  console.log("Using confidential OAuth client for:", baseUrl);

  const forwardedProto = event?.headers?.["x-forwarded-proto"] || "https";
  // If we're in Netlify Live mode, use the DEPLOY_URL (tunnel URL)
  // Otherwise use the host header
  if (isNetlifyLive) {
    baseUrl = deployUrl;
    console.log("Using Netlify Live tunnel for OAuth:", baseUrl);
  } else {
    baseUrl = host ? `${forwardedProto}://${host}` : deployUrl;
    console.log("Using confidential OAuth client for:", baseUrl);
  }

  if (!baseUrl) {
    throw new Error("No base URL available for OAuth configuration");
  }

  const config: OAuthConfig = {
    clientId: `${baseUrl}/oauth-client-metadata.json`,
    redirectUri: `${baseUrl}/.netlify/functions/oauth-callback`,
    jwksUri: `${baseUrl}/.netlify/functions/jwks`,
    clientType: "discoverable",
    usePrivateKey: true,
  };

  configCache.set(cacheKey, config, 300000);
  return config;
}
