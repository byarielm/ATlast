import { OAuthConfig } from "../../core/types";
import { ApiError } from "../../core/errors";
import { configCache } from "../cache/CacheService";
import { CONFIG } from "../../core/config/constants";

export function getOAuthConfig(event?: {
  headers: Record<string, string | undefined>;
}): OAuthConfig {
  // 1. Determine host dynamically
  const host = event?.headers?.host;
  const cacheKey = `oauth-config-${host || "default"}`;

  const cached = configCache.get(cacheKey) as OAuthConfig | undefined;
  if (cached) {
    return cached;
  }

  let baseUrl: string | undefined;

  // 2. Determine if local based on host header
  const isLocal =
    !host || host.includes("localhost") || host.includes("127.0.0.1");

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

  // 4. Production oauth config
  console.log("Using confidential OAuth client for:", baseUrl);

  const forwardedProto = event?.headers?.["x-forwarded-proto"] || "https";
  baseUrl = host
    ? `${forwardedProto}://${host}`
    : process.env.DEPLOY_URL || process.env.URL;

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
