import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { createOAuthClient } from "./client";
import { userSessions } from "./oauth-stores-db";
import { getOAuthConfig } from "./oauth-config";
import * as crypto from "crypto";

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

    console.log(
      "[oauth-callback] Processing callback - Mode:",
      isDev ? "loopback" : "production",
    );
    console.log("[oauth-callback] URL:", currentUrl);

    if (!code || !state) {
      return {
        statusCode: 302,
        headers: {
          Location: `${currentUrl}/?error=Missing OAuth parameters`,
        },
        body: "",
      };
    }

    // Create OAuth client using shared helper
    const client = await createOAuthClient();

    // Process the OAuth callback
    const result = await client.callback(params);

    console.log(
      "[oauth-callback] Successfully authenticated DID:",
      result.session.did,
    );

    // Store session
    const sessionId = crypto.randomUUID();
    const did = result.session.did;
    await userSessions.set(sessionId, { did });

    console.log("[oauth-callback] Created user session:", sessionId);

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
