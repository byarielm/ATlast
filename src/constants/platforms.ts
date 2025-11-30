import {
  SiX,
  SiInstagram,
  SiYoutube,
  SiTwitch,
  SiTiktok,
  SiTumblr,
} from "@icons-pack/react-simple-icons";

import { LucideIcon } from "lucide-react";

export interface PlatformConfig {
  name: string;
  icon: LucideIcon;
  color: string;
  accentBg: string;
  fileHint: string;
  enabled: boolean;
  defaultApp: string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  twitter: {
    name: "Twitter/X",
    icon: SiX,
    color: "from-blue-400 to-blue-600",
    accentBg: "bg-blue-500",
    fileHint: "following.txt, data.json, or data.zip",
    enabled: false,
    defaultApp: "bluesky",
  },
  instagram: {
    name: "Instagram",
    icon: SiInstagram,
    color: "from-pink-500 via-purple-500 to-orange-500",
    accentBg: "bg-pink-500",
    fileHint: "following.html or data ZIP",
    enabled: true,
    defaultApp: "bluesky",
  },
  tiktok: {
    name: "TikTok",
    icon: SiTiktok,
    color: "from-black via-gray-800 to-cyan-400",
    accentBg: "bg-black",
    fileHint: "Following.txt or data ZIP",
    enabled: true,
    defaultApp: "spark",
  },
  tumblr: {
    name: "Tumblr",
    icon: SiTumblr,
    color: "from-indigo-600 to-blue-800",
    accentBg: "bg-indigo-600",
    fileHint: "following.csv or data export",
    enabled: false,
    defaultApp: "bluesky",
  },
  twitch: {
    name: "Twitch",
    icon: SiTwitch,
    color: "from-purple-600 to-purple-800",
    accentBg: "bg-purple-600",
    fileHint: "following.json or data export",
    enabled: false,
    defaultApp: "bluesky",
  },
  youtube: {
    name: "YouTube",
    icon: SiYoutube,
    color: "from-red-600 to-red-700",
    accentBg: "bg-red-600",
    fileHint: "subscriptions.csv or Takeout ZIP",
    enabled: false,
    defaultApp: "bluesky",
  },
};

export const SEARCH_CONFIG = {
  BATCH_SIZE: 25,
  MAX_MATCHES: 1000,
};

export const FOLLOW_CONFIG = {
  BATCH_SIZE: 50,
};

/**
 * @deprecated Use getPlatformColor from lib/utils/platform instead
 **/
export function getLegacyPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    tiktok: "from-black via-gray-800 to-cyan-400",
    twitter: "from-blue-400 to-blue-600",
    instagram: "from-pink-500 via-purple-500 to-orange-500",
  };
  return colors[platform] || "from-gray-400 to-gray-600";
}
