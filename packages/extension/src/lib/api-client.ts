/**
 * ATlast API client for extension
 */

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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const data: ExtensionImportResponse = await response.json();
    return data;
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
  return chrome.runtime.getManifest().version;
}
