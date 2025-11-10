export type AtprotoAppId = 'bluesky' | 'tangled' | 'spark' | 'bsky list';

export interface AtprotoApp {
  id: AtprotoAppId;
  name: string;
  description: string;
  color: string;
  icon: string;
  action: string;
  enabled: boolean;
}

export interface PlatformDestinations {
  twitter: AtprotoAppId;
  instagram: AtprotoAppId;
  tiktok: AtprotoAppId;
  github: AtprotoAppId;
  twitch: AtprotoAppId;
  youtube: AtprotoAppId;
  tumblr: AtprotoAppId;
}

export interface UserSettings {
  platformDestinations: PlatformDestinations;
  saveData: boolean;
  enableAutomation: boolean;
  automationFrequency: 'weekly' | 'monthly' | 'quarterly';
  wizardCompleted: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  platformDestinations: {
    twitter: 'bluesky',
    instagram: 'bluesky',
    tiktok: 'spark',
    github: 'tangled',
    twitch: 'bluesky',
    youtube: 'bluesky',
    tumblr: 'bluesky',
  },
  saveData: true,
  enableAutomation: false,
  automationFrequency: 'monthly',
  wizardCompleted: false,
};