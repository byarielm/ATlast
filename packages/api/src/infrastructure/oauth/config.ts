import { OAuthConfig } from "./types";
import { Context } from "hono";

// OAuth configuration constants
const OAUTH_SCOPES = "atproto transition:generic";
const STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export const CONFIG = {
  OAUTH_SCOPES,
  OAUTH_KEY_ID: "atlast-key-1",
  STATE_EXPIRY,
  SESSION_EXPIRY,
};

// Simple in-memory cache for OAuth configs (5 min expiry)
const configCache = new Map<
  string,
  { config: OAuthConfig; expiresAt: number }
>();

/**
 * Get OAuth configuration based on request context
 * Handles both local development (loopback) and production (confidential client)
 */
export function getOAuthConfig(c: Context): OAuthConfig {
  // Determine host from request
  const host = c.req.header("host");
  const forwardedHost = c.req.header("x-forwarded-host");
  const forwardedProto = c.req.header("x-forwarded-proto") || "https";

  console.log("[oauth-config] Host from headers:", {
    host,
    forwardedHost,
    forwardedProto,
  });

  // Check cache
  const cacheKey = `oauth-config-${host || "default"}`;
  const cached = configCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  // Determine if we're running locally
  const isLocal =
    !forwardedHost &&
    (!host || host.includes("localhost") || host.includes("127.0.0.1"));

  // Local OAuth configuration (loopback)
  if (isLocal) {
    const currentHost = host || "localhost:3000";
    const protocol = currentHost.includes("127.0.0.1")
      ? "http://127.0.0.1"
      : "http://localhost";

    const port = currentHost.split(":")[1] || "3000";
    const redirectUri = `${protocol}:${port}/api/auth/oauth-callback`;

    // ClientID must start with localhost
    const clientId = `http://localhost?${new URLSearchParams([
      ["redirect_uri", redirectUri],
      ["scope", CONFIG.OAUTH_SCOPES],
    ])}`;

    console.log("[oauth-config] Using loopback OAuth for local development");

    const config: OAuthConfig = {
      clientId,
      redirectUri,
      jwksUri: undefined,
      clientType: "loopback",
    };

    // Cache for 5 minutes
    configCache.set(cacheKey, {
      config,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return config;
  }

  // Production OAuth configuration (confidential client)
  const baseHost = forwardedHost || host;
  if (!baseHost) {
    throw new Error("No base URL available for OAuth configuration");
  }

  const baseUrl = `${forwardedProto}://${baseHost}`;
  console.log("[oauth-config] Using confidential OAuth client for:", baseUrl);

  const config: OAuthConfig = {
    clientId: `${baseUrl}/api/auth/client-metadata.json`,
    redirectUri: `${baseUrl}/api/auth/oauth-callback`,
    jwksUri: `${baseUrl}/api/auth/jwks`,
    clientType: "discoverable",
    usePrivateKey: true,
  };

  // Cache for 5 minutes
  configCache.set(cacheKey, {
    config,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return config;
}
