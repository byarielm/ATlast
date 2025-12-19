import { ApiError } from "./core/errors";
import { SimpleHandler } from "./core/types/api.types";
import { SessionService } from "./services/SessionService";
import { getOAuthConfig } from "./infrastructure/oauth";
import { extractSessionId } from "./core/middleware";
import { withErrorHandling } from "./core/middleware";

const logoutHandler: SimpleHandler = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new ApiError(
      "Method not allowed",
      405,
      `Only POST method is supported for ${event.path}`,
    );
  }

  console.log("[logout] Starting logout process...");

  const sessionId = extractSessionId(event);
  console.log("[logout] Session ID from cookie:", sessionId);

  if (sessionId) {
    await SessionService.deleteSession(sessionId, event);
    console.log("[logout] Successfully deleted session:", sessionId);
  }

  const config = getOAuthConfig(event);
  const isDev = config.clientType === "loopback";
  const cookieName = isDev ? "atlast_session_dev" : "atlast_session";

  const cookieFlags = isDev
    ? `HttpOnly; SameSite=Lax; Max-Age=0; Path=/`
    : `HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${cookieName}=; ${cookieFlags}`,
    },
    body: JSON.stringify({ success: true }),
  };
};

export const handler = withErrorHandling(logoutHandler);
