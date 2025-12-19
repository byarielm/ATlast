import { SimpleHandler } from "./core/types/api.types";
import { createOAuthClient, getOAuthConfig } from "./infrastructure/oauth";
import { createSecureSessionData } from "./core/middleware/session-security.middleware";
import { userSessions } from "./infrastructure/oauth/stores";
import { redirectResponse } from "./utils";
import { withErrorHandling } from "./core/middleware";
import { CONFIG } from "./core/config/constants";
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

  const client = await createOAuthClient();

  const result = await client.callback(params);

  console.log(
    "[oauth-callback] Successfully authenticated DID:",
    result.session.did,
  );

  const sessionId = crypto.randomUUID();
  const secureData = createSecureSessionData(event, result.session.did);

  await userSessions.set(sessionId, {
    did: secureData.did,
    fingerprint: secureData.fingerprint,
  });

  console.log("[oauth-callback] Created user session:", sessionId);

  const cookieName = isDev ? "atlast_session_dev" : "atlast_session";
  const cookieFlags = isDev
    ? `HttpOnly; SameSite=Lax; Max-Age=${CONFIG.COOKIE_MAX_AGE}; Path=/`
    : `HttpOnly; SameSite=Lax; Max-Age=${CONFIG.COOKIE_MAX_AGE}; Path=/; Secure`;

  return redirectResponse(
    `${currentUrl}/?session=${sessionId}`,
    `${cookieName}=${sessionId}; ${cookieFlags}`,
  );
};

export const handler = withErrorHandling(oauthCallbackHandler);
