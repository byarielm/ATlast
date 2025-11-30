// Authentication and session types

export interface AtprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

export interface UserSessionData {
  did: string;
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  jwksUri?: string;
  clientType: "loopback" | "discoverable";
  usePrivateKey?: boolean;
}

export interface StateData {
  dpopKey: any;
  verifier: string;
  appState?: string;
}

export interface SessionData {
  dpopKey: any;
  tokenSet: any;
}
