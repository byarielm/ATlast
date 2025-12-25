/**
 * Environment configuration
 * Centralizes all environment variable access and validation
 */

// Determine environment
const nodeEnv = import.meta.env.MODE || "development";

export const ENV = {
  // Environment
  NODE_ENV: nodeEnv,
  IS_DEVELOPMENT: nodeEnv === "development",
  IS_PRODUCTION: nodeEnv === "production",
  IS_TEST: nodeEnv === "test",

  // Feature flags
  IS_LOCAL_MOCK: import.meta.env.VITE_LOCAL_MOCK === "true",
  ENABLE_OAUTH: import.meta.env.VITE_ENABLE_OAUTH !== "false",
  ENABLE_DATABASE: import.meta.env.VITE_ENABLE_DATABASE !== "false",

  // API
  API_BASE: import.meta.env.VITE_API_BASE || "/.netlify/functions",
} as const;

export function isLocalMockMode(): boolean {
  return ENV.IS_LOCAL_MOCK;
}

export function getApiUrl(endpoint: string): string {
  return `${ENV.API_BASE}/${endpoint}`;
}
