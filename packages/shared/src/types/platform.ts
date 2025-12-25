export enum Platform {
  Twitter = 'twitter',
  Threads = 'threads',
  Instagram = 'instagram',
  TikTok = 'tiktok',
}

export interface PlatformConfig {
  platform: Platform;
  displayName: string;
  hostPatterns: string[];
  followingPathPattern: RegExp;
  iconUrl: string;
}
