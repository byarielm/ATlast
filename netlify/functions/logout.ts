import { SimpleHandler } from "./shared/types/api.types";
import { SessionService } from "./shared/services/session";
import { getOAuthConfig } from "./shared/services/oauth";
import { extractSessionId } from "./shared/middleware";
import { withErrorHandling } from "./shared/middleware";

const logoutHandler: SimpleHandler = async (event) => {
  // Only allow POST for logout
  if (event.httpMethod !== "POST") {
    throw new Error("Method not allowed");
  }

  console.log("[logout] Starting logout process...");
  console.log("[logout] Cookies received:", event.headers.cookie);

  const sessionId = extractSessionId(event);
  console.log("[logout] Session ID from cookie:", sessionId);

  if (sessionId) {
    // Use SessionService to properly clean up both user and OAuth sessions
    await SessionService.deleteSession(sessionId);
    console.log("[logout] Successfully deleted session:", sessionId);
  }

  // Clear the session cookie with matching flags from when it was set
  const config = getOAuthConfig();
  const isDev = config.clientType === "loopback";

  const cookieFlags = isDev
    ? `HttpOnly; SameSite=Lax; Max-Age=0; Path=/`
    : `HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `atlast_session=; ${cookieFlags}`,
    },
    body: JSON.stringify({ success: true }),
  };
};

export const handler = withErrorHandling(logoutHandler);
