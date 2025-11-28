import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { userSessions } from "./oauth-stores-db";
import { getOAuthConfig } from "./oauth-config";
import cookie from "cookie";

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
  // Only allow POST for logout
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    console.log("[logout] Starting logout process...");
    console.log("[logout] Cookies received:", event.headers.cookie);

    // Get session from cookie
    const cookies = event.headers.cookie
      ? cookie.parse(event.headers.cookie)
      : {};
    const sessionId = cookies.atlast_session;
    console.log("[logout] Session ID from cookie:", sessionId);

    if (sessionId) {
      // Get the DID before deleting
      const userSession = await userSessions.get(sessionId);
      const did = userSession?.did;

      // Delete session from database
      await userSessions.del(sessionId);
      console.log("[logout] Deleted session from database");
    }

    // Clear the session cookie with matching flags from when it was set
    const config = getOAuthConfig();
    const isDev = config.clientType === "loopback";

    const cookieFlags = isDev
      ? "HttpOnly; SameSite=Lax; Max-Age=0; Path=/"
      : "HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `atlast_session=; ${cookieFlags}`,
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Logout error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to logout",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
