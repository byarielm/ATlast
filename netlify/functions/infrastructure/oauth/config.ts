import { OAuthConfig } from "../../core/types";
import { ApiError } from "../../core/errors";
import { configCache } from "../cache/CacheService";
import { CONFIG } from "../../core/config/constants";

export function getOAuthConfig(event?: {
  headers: Record<string, string | undefined>;
}): OAuthConfig {
  const host = event?.headers?.host || "default";
  const cacheKey = `oauth-config-${host}`;

  const cached = configCache.get(cacheKey) as OAuthConfig | undefined;
  if (cached) {
    return cached;
  }

  let baseUrl: string | undefined;
  let deployContext: string | undefined;

  if (event?.headers) {
    deployContext = event.headers["x-nf-deploy-context"];
    const forwardedProto = event.headers["x-forwarded-proto"] || "https";

    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      baseUrl = `${forwardedProto}://${host}`;
    }
  }

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

  const isLocalhost =
    !baseUrl || baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  let config: OAuthConfig;

  if (isLocalhost) {
    const port = process.env.PORT || "8888";
    const clientId = `http://localhost?${new URLSearchParams([
      [
        "redirect_uri",
        `http://127.0.0.1:${port}/.netlify/functions/oauth-callback`,
      ],
      ["scope", CONFIG.OAUTH_SCOPES],
    ])}`;

    console.log("Using loopback OAuth for local development");

    config = {
      clientId: clientId,
      redirectUri: `http://127.0.0.1:${port}/.netlify/functions/oauth-callback`,
      jwksUri: undefined,
      clientType: "loopback",
    };
  } else {
    if (!baseUrl) {
      throw new ApiError(
        "No public URL available for OAuth configuration",
        500,
        "Missing DEPLOY_URL or URL environment variables.",
      );
    }

    console.log("Using confidential OAuth client for:", baseUrl);

    config = {
      clientId: `${baseUrl}/oauth-client-metadata.json`,
      redirectUri: `${baseUrl}/.netlify/functions/oauth-callback`,
      jwksUri: `${baseUrl}/.netlify/functions/jwks`,
      clientType: "discoverable",
      usePrivateKey: true,
    };
  }

  configCache.set(cacheKey, config, 300000);

  return config;
}
