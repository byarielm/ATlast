import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { createOAuthClient, getOAuthConfig, CONFIG } from "../infrastructure/oauth";
import { userSessionStore } from "../infrastructure/oauth/stores";
import { ValidationError, ApiError } from "../errors";
import { createSecureSessionData } from "../utils/session-security";
import { extractSessionId } from "../middleware/auth";
import * as crypto from "crypto";

const auth = new Hono();

// OAuth public key for JWKS endpoint
const PUBLIC_JWK = {
  kty: "EC",
  x: "3sVbr4xwN7UtmG1L19vL0x9iN-FRcl7p-Wja_xPbhhk",
  y: "Y1XKDaAyDwijp8aEIGHmO46huKjajSQH2cbfpWaWpQ4",
  crv: "P-256",
  kid: CONFIG.OAUTH_KEY_ID,
  use: "sig",
  alg: "ES256",
};

/**
 * POST /api/auth/oauth-start
 * Initiates OAuth flow with AT Protocol provider
 */
auth.post("/oauth-start", async (c) => {
  const body = await c.req.json<{ login_hint?: string }>();
  const loginHint = body.login_hint;

  if (!loginHint) {
    throw new ValidationError("login_hint (handle or DID) is required");
  }

  console.log("[oauth-start] Starting OAuth flow for:", loginHint);

  try {
    const client = await createOAuthClient(c);
    console.log("[oauth-start] OAuth client created successfully");

    const authUrl = await client.authorize(loginHint, {
      scope: CONFIG.OAUTH_SCOPES,
    });
    console.log("[oauth-start] Generated auth URL successfully");

    return c.json({
      success: true,
      data: { url: authUrl.toString() },
    });
  } catch (error) {
    console.error(
      "[oauth-start] Failed:",
      error instanceof Error ? error.message : String(error),
    );
    throw new ApiError(
      "Failed to start OAuth flow",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});

/**
 * GET /api/auth/oauth-callback
 * OAuth callback endpoint - handles authorization code exchange
 */
auth.get("/oauth-callback", async (c) => {
  const config = getOAuthConfig(c);
  const isDev = config.clientType === "loopback";

  // Determine frontend URL
  const currentUrl = config.redirectUri.replace("/api/auth/oauth-callback", "");

  // Parse query parameters
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  console.log(
    "[oauth-callback] Processing callback - Mode:",
    isDev ? "loopback" : "production",
  );

  if (!code || !state) {
    return c.redirect(`${currentUrl}/?error=Missing OAuth parameters`);
  }

  try {
    const client = await createOAuthClient(c);
    const result = await client.callback(url.searchParams);

    console.log(
      "[oauth-callback] Successfully authenticated DID:",
      result.session.did,
    );

    // Create user session
    const sessionId = crypto.randomUUID();
    const secureData = createSecureSessionData(c, result.session.did);

    await userSessionStore.set(sessionId, {
      did: secureData.did,
      fingerprint: JSON.stringify(secureData.fingerprint),
    });

    console.log("[oauth-callback] Created user session:", sessionId);

    // Determine cookie configuration
    const isSecure = currentUrl.startsWith("https://");
    const cookieName = isDev ? "atlast_session_dev" : "atlast_session";

    // Set secure cookie
    setCookie(c, cookieName, sessionId, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 2592000, // 30 days
      path: "/",
      secure: isSecure,
    });

    console.log("[oauth-callback] Set cookie:", cookieName);

    // Redirect back to frontend with session indicator
    return c.redirect(`${currentUrl}/?session=${sessionId}`);
  } catch (error) {
    console.error("[oauth-callback] Failed:", error);
    return c.redirect(`${currentUrl}/?error=Authentication failed`);
  }
});

/**
 * GET /api/auth/session
 * Get current user session information
 */
auth.get("/session", async (c) => {
  const sessionId = c.req.query("session") || extractSessionId(c);

  if (!sessionId) {
    return c.json(
      {
        success: false,
        error: "No session cookie",
      },
      401,
    );
  }

  const userSession = await userSessionStore.get(sessionId);
  if (!userSession) {
    return c.json(
      {
        success: false,
        error: "Invalid or expired session",
      },
      401,
    );
  }

  // For now, return basic session info
  // Later: integrate with AT Protocol to fetch profile
  return c.json({
    success: true,
    data: {
      did: userSession.did,
      sessionId,
    },
  });
});

/**
 * POST /api/auth/logout
 * Clear user session and cookies
 */
auth.post("/logout", async (c) => {
  console.log("[logout] Starting logout process...");

  const sessionId = extractSessionId(c);
  console.log("[logout] Session ID from cookie:", sessionId);

  if (sessionId) {
    await userSessionStore.del(sessionId);
    console.log("[logout] Successfully deleted session:", sessionId);
  }

  const config = getOAuthConfig(c);
  const isDev = config.clientType === "loopback";
  const cookieName = isDev ? "atlast_session_dev" : "atlast_session";

  // Clear cookie by setting Max-Age to 0
  setCookie(c, cookieName, "", {
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 0,
    path: "/",
    secure: !isDev,
  });

  return c.json({ success: true });
});

/**
 * GET /api/auth/client-metadata.json
 * OAuth client metadata for AT Protocol discovery
 */
auth.get("/client-metadata.json", (c) => {
  const host = c.req.header("host");
  const forwardedHost = c.req.header("x-forwarded-host");
  const requestHost = forwardedHost || host;

  if (!requestHost) {
    return c.json({ error: "Missing host header" }, 400);
  }

  // Check if this is a loopback/development request
  const isLoopback =
    requestHost.startsWith("127.0.0.1") ||
    requestHost.startsWith("[::1]") ||
    requestHost.includes("localhost");

  if (isLoopback) {
    // For loopback clients, return minimal metadata
    const appUrl = `http://${requestHost}`;
    const redirectUri = `${appUrl}/api/auth/oauth-callback`;

    return c.json({
      client_id: appUrl,
      client_name: "ATlast (Local Dev)",
      client_uri: appUrl,
      redirect_uris: [redirectUri],
      scope: CONFIG.OAUTH_SCOPES,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    });
  }

  // Production: Confidential client metadata
  const redirectUri = `https://${requestHost}/api/auth/oauth-callback`;
  const appUrl = `https://${requestHost}`;
  const jwksUri = `https://${requestHost}/api/auth/jwks`;
  const clientId = `https://${requestHost}/api/auth/client-metadata.json`;
  const logoUri = `https://${requestHost}/favicon.svg`;

  return c.json(
    {
      client_id: clientId,
      client_name: "ATlast",
      client_uri: appUrl,
      redirect_uris: [redirectUri],
      logo_uri: logoUri,
      scope: CONFIG.OAUTH_SCOPES,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      dpop_bound_access_tokens: true,
      jwks_uri: jwksUri,
    },
    200,
    {
      "Cache-Control": "no-store",
    },
  );
});

/**
 * GET /api/auth/jwks
 * JSON Web Key Set for OAuth client authentication
 */
auth.get("/jwks", (c) => {
  return c.json(
    { keys: [PUBLIC_JWK] },
    200,
    {
      "Cache-Control": "public, max-age=3600",
    },
  );
});

export default auth;
