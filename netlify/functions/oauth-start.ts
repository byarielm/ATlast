import { SimpleHandler } from "./core/types/api.types";
import { createOAuthClient } from "./infrastructure/oauth/OAuthClientFactory";
import { successResponse } from "./utils";
import { withErrorHandling } from "./core/middleware";
import { ValidationError, ApiError } from "./core/errors";

interface OAuthStartRequestBody {
  login_hint?: string;
  origin?: string;
}

const oauthStartHandler: SimpleHandler = async (event) => {
  let loginHint: string | undefined = undefined;

  try {
    if (event.body) {
      const parsed: OAuthStartRequestBody = JSON.parse(event.body);
      loginHint = parsed.login_hint;
    }

    if (!loginHint) {
      throw new ValidationError("login_hint (handle or DID) is required");
    }

    console.log("[oauth-start] Starting OAuth flow for:", loginHint);

    let client;
    try {
      client = await createOAuthClient(event);
      console.log("[oauth-start] OAuth client created successfully");
    } catch (clientError) {
      console.error(
        "[oauth-start] Failed to create OAuth client:",
        clientError instanceof Error
          ? clientError.message
          : String(clientError),
      );
      throw new ApiError(
        "Failed to create OAuth client",
        500,
        clientError instanceof Error ? clientError.message : "Unknown error",
      );
    }

    let authUrl;
    try {
      authUrl = await client.authorize(loginHint, {
        scope: "atproto transition:generic",
      });
      console.log("[oauth-start] Generated auth URL successfully");
    } catch (authorizeError) {
      console.error(
        "[oauth-start] Failed to authorize:",
        authorizeError instanceof Error
          ? authorizeError.message
          : String(authorizeError),
      );
      throw new ApiError(
        "Failed to generate authorization URL",
        500,
        authorizeError instanceof Error
          ? authorizeError.message
          : "Unknown error",
      );
    }

    console.log("[oauth-start] Returning auth URL for:", loginHint);
    return successResponse({ url: authUrl.toString() });
  } catch (error) {
    // This will be caught by withErrorHandling, but log it here too for clarity
    console.error(
      "[oauth-start] Top-level error:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
};

export const handler = withErrorHandling(oauthStartHandler);
