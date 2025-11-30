import { SimpleHandler } from "./shared/types/api.types";
import { createOAuthClient } from "./shared/services/oauth";
import { successResponse } from "./shared/utils";
import { withErrorHandling } from "./shared/middleware";
import { ValidationError } from "./shared/constants/errors";

interface OAuthStartRequestBody {
  login_hint?: string;
  origin?: string;
}

const oauthStartHandler: SimpleHandler = async (event) => {
  let loginHint: string | undefined = undefined;

  if (event.body) {
    const parsed: OAuthStartRequestBody = JSON.parse(event.body);
    loginHint = parsed.login_hint;
  }

  if (!loginHint) {
    throw new ValidationError("login_hint (handle or DID) is required");
  }

  console.log("[oauth-start] Starting OAuth flow for:", loginHint);

  // Create OAuth client using shared helper
  const client = await createOAuthClient(event);

  // Start the authorization flow
  const authUrl = await client.authorize(loginHint, {
    scope: "atproto transition:generic",
  });

  console.log("[oauth-start] Generated auth URL for:", loginHint);

  return successResponse({ url: authUrl.toString() });
};

export const handler = withErrorHandling(oauthStartHandler);
