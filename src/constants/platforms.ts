import { Twitter, Instagram, Video, Hash, Gamepad2, LucideIcon } from "lucide-react";

export interface PlatformConfig {
  name: string;
  icon: LucideIcon;
  color: string;
  accentBg: string;
  fileHint: string;
  enabled: boolean;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  twitter: {
    name: 'Twitter/X',
    icon: Twitter,
    color: 'from-blue-400 to-blue-600',
    accentBg: 'bg-blue-500',
    fileHint: 'following.js or account data ZIP',
    enabled: false,
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 via-purple-500 to-orange-500',
    accentBg: 'bg-pink-500',
    fileHint: 'connections.json or data ZIP',
    enabled: false,
  },
  tiktok: {
    name: 'TikTok',
    icon: Video,
    color: 'from-black via-gray-800 to-cyan-400',
    accentBg: 'bg-black',
    fileHint: 'Following.txt or data ZIP',
    enabled: true,
  },
  tumblr: {
    name: 'Tumblr',
    icon: Hash,
    color: 'from-indigo-600 to-blue-800',
    accentBg: 'bg-indigo-600',
    fileHint: 'following.csv or data export',
    enabled: false,
  },
  twitch: {
    name: 'Twitch',
    icon: Gamepad2,
    color: 'from-purple-600 to-purple-800',
    accentBg: 'bg-purple-600',
    fileHint: 'following.json or data export',
    enabled: false,
  },
  youtube: {
    name: 'YouTube',
    icon: Video,
    color: 'from-red-600 to-red-700',
    accentBg: 'bg-red-600',
    fileHint: 'subscriptions.csv or Takeout ZIP',
    enabled: false,
  },
};

export const SEARCH_CONFIG = {
  BATCH_SIZE: 25,
  MAX_MATCHES: 1000,
  BATCH_DELAY_MS: 500,
};

export const FOLLOW_CONFIG = {
  BATCH_SIZE: 50,
  BATCH_DELAY_MS: 1000,
};