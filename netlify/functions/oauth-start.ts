import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import {
  NodeOAuthClient,
  atprotoLoopbackClientMetadata,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { stateStore, sessionStore } from "./oauth-stores-db";
import { getOAuthConfig } from "./oauth-config";

interface OAuthStartRequestBody {
  login_hint?: string;
  origin?: string;
}

function normalizePrivateKey(key: string): string {
  if (!key.includes("\n") && key.includes("\\n")) {
    return key.replace(/\\n/g, "\n");
  }
  return key;
}

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
  try {
    let loginHint: string | undefined = undefined;

    if (event.body) {
      const parsed: OAuthStartRequestBody = JSON.parse(event.body);
      loginHint = parsed.login_hint;
    }

    if (!loginHint) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "login_hint (handle or DID) is required",
        }),
      };
    }

    const config = getOAuthConfig();
    const isDev = config.clientType === "loopback";

    let client: NodeOAuthClient;

    if (isDev) {
      // LOOPBACK MODE: Use atprotoLoopbackClientMetadata and NO keyset
      console.log("🔧 Using loopback OAuth client for development");
      console.log("Client ID:", config.clientId);

      const clientMetadata = atprotoLoopbackClientMetadata(config.clientId);

      client = new NodeOAuthClient({
        clientMetadata: clientMetadata,
        stateStore: stateStore as any,
        sessionStore: sessionStore as any,
      });
    } else {
      // PRODUCTION MODE: Full confidential client with keyset
      console.log("🔐 Using confidential OAuth client for production");

      if (!process.env.OAUTH_PRIVATE_KEY) {
        throw new Error("OAUTH_PRIVATE_KEY required for production");
      }

      const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
      const privateKey = await JoseKey.fromImportable(
        normalizedKey,
        "main-key",
      );

      const currentHost = process.env.DEPLOY_URL
        ? new URL(process.env.DEPLOY_URL).host
        : event.headers["x-forwarded-host"] || event.headers.host;

      if (!currentHost) {
        throw new Error("Missing host header");
      }

      const currentUrl = `https://${currentHost}`;
      const redirectUri = `${currentUrl}/.netlify/functions/oauth-callback`;
      const jwksUri = `${currentUrl}/.netlify/functions/jwks`;
      const clientId = `${currentUrl}/oauth-client-metadata.json`;

      client = new NodeOAuthClient({
        clientMetadata: {
          client_id: clientId,
          client_name: "ATlast",
          client_uri: currentUrl,
          redirect_uris: [redirectUri],
          scope: "atproto transition:generic",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          application_type: "web",
          token_endpoint_auth_method: "private_key_jwt",
          token_endpoint_auth_signing_alg: "ES256",
          dpop_bound_access_tokens: true,
          jwks_uri: jwksUri,
        } as any,
        keyset: [privateKey],
        stateStore: stateStore as any,
        sessionStore: sessionStore as any,
      });
    }

    const authUrl = await client.authorize(loginHint, {
      scope: "atproto transition:generic",
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: authUrl.toString() }),
    };
  } catch (error) {
    console.error("OAuth start error:", error);

    // Provide user-friendly error messages
    let userMessage = "Failed to start authentication";

    if (error instanceof Error) {
      if (
        error.message.includes("resolve") ||
        error.message.includes("not found")
      ) {
        userMessage =
          "Account not found. Please check your handle and try again.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        userMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message.includes("Invalid identifier")) {
        userMessage =
          "Invalid handle format. Please use the format: username.bsky.social";
      }
    }

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: userMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
