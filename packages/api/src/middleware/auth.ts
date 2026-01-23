import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { userSessionStore } from "../infrastructure/oauth";
import { AuthenticationError, ERROR_MESSAGES } from "../errors";

/**
 * Authentication middleware for Hono
 * Validates session cookies and adds user context to request
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  // Extract session from cookies
  const sessionId =
    getCookie(c, "atlast_session") || getCookie(c, "atlast_session_dev");

  if (!sessionId) {
    throw new AuthenticationError(ERROR_MESSAGES.NO_SESSION_COOKIE);
  }

  // Validate session with database
  const userSession = await userSessionStore.get(sessionId);
  if (!userSession) {
    throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
  }

  // Add session context to request
  c.set("sessionId", sessionId);
  c.set("did", userSession.did);

  await next();
});

/**
 * Extract session ID from cookies without validation
 * Returns null if no session cookie exists
 */
export function extractSessionId(c: {
  req: { header: (name: string) => string | undefined };
}): string | null {
  const cookieHeader = c.req.header("cookie");
  if (!cookieHeader) return null;

  // Simple cookie parsing (no external dependency needed for this case)
  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  return cookies.atlast_session || cookies.atlast_session_dev || null;
}
