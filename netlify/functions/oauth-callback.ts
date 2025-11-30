import { SimpleHandler } from "./shared/types/api.types";
import { createOAuthClient, getOAuthConfig } from "./shared/services/oauth";
import { userSessions } from "./shared/services/session";
import { redirectResponse } from "./shared/utils";
import { withErrorHandling } from "./shared/middleware";
import { CONFIG } from "./shared/constants";
import * as crypto from "crypto";

const oauthCallbackHandler: SimpleHandler = async (event) => {
  const config = getOAuthConfig(event);
  const isDev = config.clientType === "loopback";

  let currentUrl = isDev
    ? "http://127.0.0.1:8888"
    : config.redirectUri.replace("/.netlify/functions/oauth-callback", "");

  const params = new URLSearchParams(event.rawUrl.split("?")[1] || "");
  const code = params.get("code");
  const state = params.get("state");

  console.log(
    "[oauth-callback] Processing callback - Mode:",
    isDev ? "loopback" : "production",
  );
  console.log("[oauth-callback] URL:", currentUrl);

  if (!code || !state) {
    return redirectResponse(`${currentUrl}/?error=Missing OAuth parameters`);
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
    ? `HttpOnly; SameSite=Lax; Max-Age=${CONFIG.COOKIE_MAX_AGE}; Path=/`
    : `HttpOnly; SameSite=Lax; Max-Age=${CONFIG.COOKIE_MAX_AGE}; Path=/; Secure`;

  return redirectResponse(`${currentUrl}/?session=${sessionId}`, [
    `atlast_session=${sessionId}; ${cookieFlags}`,
  ]);
};

export const handler = withErrorHandling(oauthCallbackHandler);
