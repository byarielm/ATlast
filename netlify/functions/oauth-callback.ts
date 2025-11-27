import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import {
  NodeOAuthClient,
  atprotoLoopbackClientMetadata,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { stateStore, sessionStore, userSessions } from "./oauth-stores-db";
import { getOAuthConfig } from "./oauth-config";
import * as crypto from "crypto";

function normalizePrivateKey(key: string): string {
  if (!key.includes("\n") && key.includes("\\n")) {
    return key.replace(/\\n/g, "\n");
  }
  return key;
}

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
  const config = getOAuthConfig();
  const isDev = config.clientType === "loopback";

  let currentUrl = isDev
    ? "http://127.0.0.1:8888"
    : process.env.DEPLOY_URL
      ? `https://${new URL(process.env.DEPLOY_URL).host}`
      : process.env.URL ||
        process.env.DEPLOY_PRIME_URL ||
        "https://atlast.byarielm.fyi";

  try {
    const params = new URLSearchParams(event.rawUrl.split("?")[1] || "");
    const code = params.get("code");
    const state = params.get("state");

    console.log("OAuth callback - Mode:", isDev ? "loopback" : "production");
    console.log("OAuth callback - URL:", currentUrl);

    if (!code || !state) {
      return {
        statusCode: 302,
        headers: {
          Location: `${currentUrl}/?error=Missing OAuth parameters`,
        },
        body: "",
      };
    }

    let client: NodeOAuthClient;

    if (isDev) {
      // LOOPBACK MODE: Use atprotoLoopbackClientMetadata and NO keyset
      console.log("🔧 Loopback callback");

      const clientMetadata = atprotoLoopbackClientMetadata(config.clientId);

      client = new NodeOAuthClient({
        clientMetadata: clientMetadata,
        // No keyset for loopback!
        stateStore: stateStore as any,
        sessionStore: sessionStore as any,
      });
    } else {
      // PRODUCTION MODE
      if (!process.env.OAUTH_PRIVATE_KEY) {
        console.error("OAUTH_PRIVATE_KEY not set");
        return {
          statusCode: 302,
          headers: {
            Location: `${currentUrl}/?error=Server configuration error`,
          },
          body: "",
        };
      }

      const normalizedKey = normalizePrivateKey(process.env.OAUTH_PRIVATE_KEY);
      const privateKey = await JoseKey.fromImportable(
        normalizedKey,
        "main-key",
      );

      const currentHost = process.env.DEPLOY_URL
        ? new URL(process.env.DEPLOY_URL).host
        : event.headers["x-forwarded-host"] || event.headers.host;

      currentUrl = `https://${currentHost}`;
      const redirectUri = `${currentUrl}/.netlify/functions/oauth-callback`;
      const jwksUri = `${currentUrl}/.netlify/functions/jwks`;
      const clientId = `${currentUrl}/.netlify/functions/client-metadata`;

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

    const result = await client.callback(params);

    // Store session
    const sessionId = crypto.randomUUID();
    const did = result.session.did;
    await userSessions.set(sessionId, { did });

    // Cookie flags - no Secure flag for loopback
    const cookieFlags = isDev
      ? "HttpOnly; SameSite=Lax; Max-Age=1209600; Path=/"
      : "HttpOnly; SameSite=Lax; Max-Age=1209600; Path=/; Secure";

    return {
      statusCode: 302,
      headers: {
        Location: `${currentUrl}/?session=${sessionId}`,
        "Set-Cookie": `atlast_session=${sessionId}; ${cookieFlags}`,
      },
      body: "",
    };
  } catch (error) {
    console.error("OAuth callback error:", error);
    return {
      statusCode: 302,
      headers: {
        Location: `${currentUrl}/?error=OAuth failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      body: "",
    };
  }
};
