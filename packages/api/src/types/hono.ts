/**
 * Hono Context Types
 * Defines custom variables available in the request context
 */

/**
 * Custom variables set by middleware and available via c.get()/c.set()
 */
export interface AppVariables {
  /** User's decentralized identifier, set by authMiddleware */
  did: string;
  /** Session ID from the cookie, set by authMiddleware */
  sessionId: string;
}

/**
 * Environment type for the Hono app
 * This enables type-safe access to context variables
 */
export interface AppEnv {
  Variables: AppVariables;
}
