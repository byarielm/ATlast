import { SimpleHandler } from "./core/types/api.types";
import { createOAuthClient } from "./infrastructure/oauth/OAuthClientFactory";
import { successResponse } from "./utils";
import { withErrorHandling } from "./core/middleware";
import { ValidationError } from "./core/errors";

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

  const client = await createOAuthClient(event);

  const authUrl = await client.authorize(loginHint, {
    scope: "atproto transition:generic",
  });

  console.log("[oauth-start] Generated auth URL for:", loginHint);

  return successResponse({ url: authUrl.toString() });
};

export const handler = withErrorHandling(oauthStartHandler);
