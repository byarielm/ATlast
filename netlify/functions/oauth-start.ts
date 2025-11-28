import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { createOAuthClient } from "./client";

interface OAuthStartRequestBody {
  login_hint?: string;
  origin?: string;
}

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
  try {
    let loginHint: string | undefined = undefined;

    if (event.body) {
      const parsed: OAuthStartRequestBody = JSON.parse(event.body);
      loginHint = parsed.login_hint;
    }

    if (!loginHint) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "login_hint (handle or DID) is required",
        }),
      };
    }

    console.log("[oauth-start] Starting OAuth flow for:", loginHint);

    // Create OAuth client using shared helper
    const client = await createOAuthClient();

    // Start the authorization flow
    const authUrl = await client.authorize(loginHint, {
      scope: "atproto transition:generic",
    });

    console.log("[oauth-start] Generated auth URL for:", loginHint);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: authUrl.toString() }),
    };
  } catch (error) {
    console.error("OAuth start error:", error);

    // Provide user-friendly error messages
    let userMessage = "Failed to start authentication";

    if (error instanceof Error) {
      if (
        error.message.includes("resolve") ||
        error.message.includes("not found")
      ) {
        userMessage =
          "Account not found. Please check your handle and try again.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        userMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message.includes("Invalid identifier")) {
        userMessage =
          "Invalid handle format. Please use the format: username.bsky.social";
      }
    }

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: userMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
