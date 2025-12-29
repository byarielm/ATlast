/**
 * ATlast API client for extension
 */

import browser from 'webextension-polyfill';

// These are replaced at build time by esbuild
declare const __ATLAST_API_URL__: string;
declare const __BUILD_MODE__: string;

// API URL configuration - injected at build time
const ATLAST_API_URL = __ATLAST_API_URL__;

console.log(`[API Client] Running in ${__BUILD_MODE__} mode`);
console.log(`[API Client] API URL: ${ATLAST_API_URL}`);

export interface ExtensionImportRequest {
  platform: string;
  usernames: string[];
  metadata: {
    extensionVersion: string;
    scrapedAt: string;
    pageType: string;
    sourceUrl: string;
  };
}

export interface ExtensionImportResponse {
  importId: string;
  usernameCount: number;
  redirectUrl: string;
}

/**
 * Upload scraped usernames to ATlast
 */
export async function uploadToATlast(
  request: ExtensionImportRequest
): Promise<ExtensionImportResponse> {
  const url = `${ATLAST_API_URL}/.netlify/functions/extension-import`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include', // Include cookies for auth
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    // Backend wraps response in ApiResponse structure: { success: true, data: {...} }
    const apiResponse: { success: boolean; data: ExtensionImportResponse } = await response.json();
    return apiResponse.data;
  } catch (error) {
    console.error('[API Client] Upload error:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to upload to ATlast');
  }
}

/**
 * Get extension version from manifest
 */
export function getExtensionVersion(): string {
  return browser.runtime.getManifest().version;
}

/**
 * Check if ATlast server is running
 * Returns true if server is reachable, false otherwise
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    // Try to fetch the health endpoint with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${ATLAST_API_URL}/.netlify/functions/health`, {
      method: 'GET',
      signal: controller.signal,
      credentials: 'include', // Include for CORS
    });

    clearTimeout(timeoutId);

    // Any successful response means server is running
    return response.ok;
  } catch (error) {
    console.error('[API Client] Server health check failed:', error);
    return false;
  }
}

/**
 * Get the API URL (for display purposes)
 */
export function getApiUrl(): string {
  return ATLAST_API_URL;
}

/**
 * Check if user is logged in to ATlast
 * Returns user profile if logged in, null otherwise
 */
export async function checkSession(): Promise<{
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
} | null> {
  try {
    const response = await fetch(`${ATLAST_API_URL}/.netlify/functions/session`, {
      method: 'GET',
      credentials: 'include', // Include cookies
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('[API Client] Not logged in');
      return null;
    }

    // Backend wraps response in ApiResponse structure: { success: true, data: {...} }
    const apiResponse: { success: boolean; data: any } = await response.json();
    return apiResponse.data;
  } catch (error) {
    console.error('[API Client] Session check failed:', error);
    return null;
  }
}
