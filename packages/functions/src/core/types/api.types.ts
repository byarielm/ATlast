import { HandlerEvent, HandlerResponse } from "@netlify/functions";

// Request context with authenticated session
export interface AuthenticatedContext {
  sessionId: string;
  did: string;
  event: HandlerEvent;
}

// Standard API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

// Session data structures
export interface StateData {
  dpopKey: any;
  verifier: string;
  appState?: string;
}

export interface SessionData {
  dpopJwk?: any;
  dpopKey: any;
  tokenSet: any;
  authMethod?: string;
}

export interface UserSessionData {
  did: string;
  fingerprint?: any;
}

// OAuth configuration
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  jwksUri?: string;
  clientType: "loopback" | "discoverable";
  usePrivateKey?: boolean;
}

// Handler types
export type SimpleHandler = (event: HandlerEvent) => Promise<HandlerResponse>;

export type AuthenticatedHandler = (
  context: AuthenticatedContext,
) => Promise<HandlerResponse>;
