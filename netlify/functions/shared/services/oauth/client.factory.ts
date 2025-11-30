import {
  NodeOAuthClient,
  atprotoLoopbackClientMetadata,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { stateStore, sessionStore } from "../session/stores";
import { getOAuthConfig } from "./config";

function normalizePrivateKey(key: string): string {
  if (!key.includes("\n") && key.includes("\\n")) {
    return key.replace(/\\n/g, "\n");
  }
  return key;
}

/**
 * Creates and returns a configured OAuth client based on environment
 * Centralizes the client creation logic used across all endpoints
 **/
export async function createOAuthClient(event?: {
  headers: Record<string, string | undefined>;
}): Promise<NodeOAuthClient> {
  const config = getOAuthConfig(event);
  const isDev = config.clientType === "loopback";

  if (isDev) {
    // Loopback mode for local development
    console.log("[oauth-client] Creating loopback OAuth client");
    const clientMetadata = atprotoLoopbackClientMetadata(config.clientId);

    return new NodeOAuthClient({
      clientMetadata: clientMetadata,
      stateStore: stateStore as any,
      sessionStore: sessionStore as any,
    });
  } else {
    // Production mode with private key
    console.log("[oauth-client] Creating production OAuth client");

    if (!process.env.OAUTH_PRIVATE_KEY) {
      throw new Error("OAUTH_PRIVATE_KEY is required for production");
    }

    const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
    const privateKey = await JoseKey.fromImportable(normalizedKey, "main-key");

    return new NodeOAuthClient({
      clientMetadata: {
        client_id: config.clientId,
        client_name: "ATlast",
        client_uri: config.clientId.replace("/oauth-client-metadata.json", ""),
        redirect_uris: [config.redirectUri],
        scope: "atproto transition:generic",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        application_type: "web",
        token_endpoint_auth_method: "private_key_jwt",
        token_endpoint_auth_signing_alg: "ES256",
        dpop_bound_access_tokens: true,
        jwks_uri: config.jwksUri,
      },
      keyset: [privateKey],
      stateStore: stateStore as any,
      sessionStore: sessionStore as any,
    });
  }
}
