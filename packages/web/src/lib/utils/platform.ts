import { PLATFORMS, type PlatformConfig } from "../../config/platforms";
import { ATPROTO_APPS, type AtprotoApp } from "../../config/atprotoApps";
import type { AtprotoAppId } from "../../types/settings";

// Cache for platform lookups
const platformCache = new Map<string, PlatformConfig>();
const appCache = new Map<AtprotoAppId, AtprotoApp>();

/**
 * Get platform configuration by key (memoized)
 */
export function getPlatform(platformKey: string): PlatformConfig {
  if (!platformCache.has(platformKey)) {
    platformCache.set(platformKey, PLATFORMS[platformKey] || PLATFORMS.tiktok);
  }
  return platformCache.get(platformKey)!;
}

/**
 * Get platform gradient color classes for UI
 */
export function getPlatformColor(platformKey: string): string {
  const colors: Record<string, string> = {
    tiktok: "from-black via-gray-800 to-cyan-400",
    twitter: "from-blue-400 to-blue-600",
    instagram: "from-pink-500 via-purple-500 to-orange-500",
    tumblr: "from-indigo-600 to-blue-800",
    twitch: "from-purple-600 to-purple-800",
    youtube: "from-red-600 to-red-700",
  };
  return colors[platformKey] || "from-gray-400 to-gray-600";
}

/**
 * Get ATProto app configuration by ID (memoized)
 */
export function getAtprotoApp(appId: AtprotoAppId): AtprotoApp | undefined {
  if (!appCache.has(appId)) {
    const app = ATPROTO_APPS[appId];
    if (app) {
      appCache.set(appId, app);
    }
  }
  return appCache.get(appId);
}

/**
 * Get ATProto app with fallback to default (memoized)
 */
export function getAtprotoAppWithFallback(
  appId: AtprotoAppId,
  defaultApp: AtprotoAppId = "bluesky",
): AtprotoApp {
  return (
    getAtprotoApp(appId) || getAtprotoApp(defaultApp) || ATPROTO_APPS.bluesky
  );
}

/**
 * Get all enabled ATProto apps (cached result)
 */
let enabledAppsCache: AtprotoApp[] | null = null;
export function getEnabledAtprotoApps(): AtprotoApp[] {
  if (!enabledAppsCache) {
    enabledAppsCache = Object.values(ATPROTO_APPS).filter((app) => app.enabled);
  }
  return enabledAppsCache;
}

/**
 * Get all enabled platforms (cached result)
 */
let enabledPlatformsCache: Array<[string, PlatformConfig]> | null = null;
export function getEnabledPlatforms(): Array<[string, PlatformConfig]> {
  if (!enabledPlatformsCache) {
    enabledPlatformsCache = Object.entries(PLATFORMS).filter(
      ([_, config]) => config.enabled,
    );
  }
  return enabledPlatformsCache;
}

/**
 * Check if a platform is enabled
 */
export function isPlatformEnabled(platformKey: string): boolean {
  return PLATFORMS[platformKey]?.enabled || false;
}

/**
 * Check if an app is enabled
 */
export function isAppEnabled(appId: AtprotoAppId): boolean {
  return ATPROTO_APPS[appId]?.enabled || false;
}

/**
 * Clear all caches (useful for hot reload in development)
 */
export function clearPlatformCaches(): void {
  platformCache.clear();
  appCache.clear();
  enabledAppsCache = null;
  enabledPlatformsCache = null;
}
