/**
 * ATlast API client for extension
 */

// API URL configuration
const ATLAST_API_URL = import.meta.env?.MODE === 'production'
  ? 'https://atlast.byarielm.fyi'
  : 'http://127.0.0.1:8888';

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
