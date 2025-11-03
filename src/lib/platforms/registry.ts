import type { PlatformConfig } from './types';
import { tiktokPlatform } from './tiktok';
import { instagramPlatform } from './instagram';

// Registry of all supported platforms
const platformRegistry = new Map<string, PlatformConfig>();

// Register platforms
platformRegistry.set('tiktok', tiktokPlatform);
platformRegistry.set('instagram', instagramPlatform);

// Future platforms can be added here:
// platformRegistry.set('twitter', twitterPlatform);
// platformRegistry.set('youtube', youtubePlatform);

export function getPlatform(platformId: string): PlatformConfig | undefined {
  return platformRegistry.get(platformId);
}

export function getAllPlatforms(): PlatformConfig[] {
  return Array.from(platformRegistry.values());
}

export function isPlatformSupported(platformId: string): boolean {
  return platformRegistry.has(platformId);
}