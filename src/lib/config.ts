export const ENV = {
  // Detect if we're in local mock mode
  IS_LOCAL_MOCK: import.meta.env.VITE_LOCAL_MOCK === "true",

  // API base URL
  API_BASE: import.meta.env.VITE_API_BASE || "/.netlify/functions",

  // Feature flags
  ENABLE_OAUTH: import.meta.env.VITE_ENABLE_OAUTH !== "false",
  ENABLE_DATABASE: import.meta.env.VITE_ENABLE_DATABASE !== "false",
} as const;

export function isLocalMockMode(): boolean {
  return ENV.IS_LOCAL_MOCK;
}

export function getApiUrl(endpoint: string): string {
  return `${ENV.API_BASE}/${endpoint}`;
}
