import {
  NodeOAuthClient,
  atprotoLoopbackClientMetadata,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { Context } from "hono";
import { ApiError } from "../../errors";
import { stateStore, sessionStore } from "./stores";
import { getOAuthConfig, CONFIG } from "./config";

/**
 * Normalizes OAuth private key format (handles escaped newlines)
 */
function normalizePrivateKey(key: string): string {
  if (!key.includes("\n") && key.includes("\\n")) {
    return key.replace(/\\n/g, "\n");
  }
  return key;
}

/**
 * Creates an AT Protocol OAuth client configured for the current environment
 * @param c - Hono context (for determining host/environment)
 * @returns Configured NodeOAuthClient instance
 */
export async function createOAuthClient(c: Context): Promise<NodeOAuthClient> {
  const config = getOAuthConfig(c);
  const isDev = config.clientType === "loopback";

  if (isDev) {
    console.log("[oauth-client] Creating loopback OAuth client");
    const clientMetadata = atprotoLoopbackClientMetadata(config.clientId);

    return new NodeOAuthClient({
      clientMetadata,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stateStore: stateStore as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionStore: sessionStore as any,
    });
  }

  // Production client with private key
  console.log("[oauth-client] Creating production OAuth client");

  if (!process.env.OAUTH_PRIVATE_KEY) {
    throw new ApiError(
      "OAuth client key missing",
      500,
      "OAUTH_PRIVATE_KEY environment variable is required for production client setup.",
    );
  }

  const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
  const privateKey = await JoseKey.fromImportable(
    normalizedKey,
    CONFIG.OAUTH_KEY_ID,
  );

  return new NodeOAuthClient({
    clientMetadata: {
      client_id: config.clientId,
      client_name: "ATlast",
      client_uri: config.clientId.replace("/api/auth/client-metadata.json", ""),
      redirect_uris: [config.redirectUri],
      scope: CONFIG.OAUTH_SCOPES,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      dpop_bound_access_tokens: true,
      jwks_uri: config.jwksUri,
    },
    keyset: [privateKey],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stateStore: stateStore as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionStore: sessionStore as any,
  });
}
