import { PLATFORMS, type PlatformConfig } from "../../config/platforms";
import { ATPROTO_APPS, type AtprotoApp } from "../../config/atprotoApps";
import type { AtprotoAppId } from "../../types/settings";

/**
 * Get platform configuration by key
 *
 * @param platformKey - The platform identifier (e.g., "tiktok", "instagram")
 * @returns Platform configuration or default to TikTok
 **/
export function getPlatform(platformKey: string): PlatformConfig {
  return PLATFORMS[platformKey] || PLATFORMS.tiktok;
}

/**
 * Get platform gradient color classes for UI
 *
 * @param platformKey - The platform identifier
 * @returns Tailwind gradient classes for the platform
 **/
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
 * Get ATProto app configuration by ID
 *
 * @param appId - The app identifier
 * @returns App configuration or undefined if not found
 **/
export function getAtprotoApp(appId: AtprotoAppId): AtprotoApp | undefined {
  return ATPROTO_APPS[appId];
}

/**
 * Get ATProto app with fallback to default
 *
 * @param appId - The app identifier
 * @param defaultApp - Default app ID to use as fallback
 * @returns App configuration, falling back to default or Bluesky
 **/
export function getAtprotoAppWithFallback(
  appId: AtprotoAppId,
  defaultApp: AtprotoAppId = "bluesky",
): AtprotoApp {
  return (
    ATPROTO_APPS[appId] || ATPROTO_APPS[defaultApp] || ATPROTO_APPS.bluesky
  );
}

/**
 * Get all enabled ATProto apps
 *
 * @returns Array of enabled app configurations
 **/
export function getEnabledAtprotoApps(): AtprotoApp[] {
  return Object.values(ATPROTO_APPS).filter((app) => app.enabled);
}

/**
 * Get all enabled platforms
 *
 * @returns Array of [key, config] tuples for enabled platforms
 **/
export function getEnabledPlatforms(): Array<[string, PlatformConfig]> {
  return Object.entries(PLATFORMS).filter(([_, config]) => config.enabled);
}

/**
 * Check if a platform is enabled
 *
 * @param platformKey - The platform identifier
 * @returns True if platform is enabled
 **/
export function isPlatformEnabled(platformKey: string): boolean {
  return PLATFORMS[platformKey]?.enabled || false;
}

/**
 * Check if an app is enabled
 *
 * @param appId - The app identifier
 * @returns True if app is enabled
 **/
export function isAppEnabled(appId: AtprotoAppId): boolean {
  return ATPROTO_APPS[appId]?.enabled || false;
}
