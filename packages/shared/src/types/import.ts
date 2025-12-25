import { Platform } from './platform';

export interface ExtensionImportRequest {
  platform: Platform;
  usernames: string[];
  metadata: {
    extensionVersion: string;
    scrapedAt: string;
    pageType: 'following' | 'followers' | 'list';
    sourceUrl: string;
  };
}

export interface ExtensionImportResponse {
  importId: string;
  usernameCount: number;
  redirectUrl: string;
}
