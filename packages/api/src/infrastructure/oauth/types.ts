/**
 * OAuth types for AT Protocol authentication
 */

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  jwksUri?: string;
  clientType: "loopback" | "discoverable";
  usePrivateKey?: boolean;
}

/**
 * State data stored during OAuth flow
 */
export interface StateData {
  iss: string;
  dpopKey: unknown; // JWK object from @atproto/oauth-client-node
  verifier?: string;
  appState?: string;
}

/**
 * Session data for OAuth sessions
 */
export interface SessionData {
  dpopJwk: unknown; // JWK object
  tokenSet: {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
    sub: string;
  };
  authMethod: string;
}

/**
 * User session data
 */
export interface UserSessionData {
  did: string;
  fingerprint?: string;
}
