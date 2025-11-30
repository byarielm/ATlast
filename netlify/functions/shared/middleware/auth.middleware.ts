import { HandlerEvent } from "@netlify/functions";
import cookie from "cookie";
import { userSessions } from "../services/session/stores";
import { AuthenticationError, ERROR_MESSAGES } from "../constants/errors";
import { AuthenticatedContext } from "../types";

/**
 * Middleware to extract and validate session from cookies
 * Throws AuthenticationError if session is invalid
 **/
export async function authenticateRequest(
  event: HandlerEvent,
): Promise<AuthenticatedContext> {
  // Parse cookies
  const cookies = event.headers.cookie
    ? cookie.parse(event.headers.cookie)
    : {};
  const sessionId = cookies.atlast_session;

  if (!sessionId) {
    throw new AuthenticationError(ERROR_MESSAGES.NO_SESSION_COOKIE);
  }

  // Validate session
  const userSession = await userSessions.get(sessionId);
  if (!userSession) {
    throw new AuthenticationError(ERROR_MESSAGES.INVALID_SESSION);
  }

  return {
    sessionId,
    did: userSession.did,
    event,
  };
}

/**
 * Extract session ID from cookies without validation
 * Returns null if no session cookie exists
 **/
export function extractSessionId(event: HandlerEvent): string | null {
  const cookies = event.headers.cookie
    ? cookie.parse(event.headers.cookie)
    : {};
  return cookies.atlast_session || null;
}
