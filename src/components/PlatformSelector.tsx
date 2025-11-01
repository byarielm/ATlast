import { Twitter, Instagram, Video, Hash, Gamepad2 } from "lucide-react";

const PLATFORMS = {
  twitter: {
    name: 'Twitter/X',
    icon: Twitter,
    color: 'from-blue-400 to-blue-600',
    accentBg: 'bg-blue-500',
    fileHint: 'following.js or account data ZIP',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 via-purple-500 to-orange-500',
    accentBg: 'bg-pink-500',
    fileHint: 'connections.json or data ZIP',
  },
  tiktok: {
    name: 'TikTok',
    icon: Video,
    color: 'from-black via-gray-800 to-cyan-400',
    accentBg: 'bg-black',
    fileHint: 'Following.txt or data ZIP',
  },
  tumblr: {
    name: 'Tumblr',
    icon: Hash,
    color: 'from-indigo-600 to-blue-800',
    accentBg: 'bg-indigo-600',
    fileHint: 'following.csv or data export',
  },
  twitch: {
    name: 'Twitch',
    icon: Gamepad2,
    color: 'from-purple-600 to-purple-800',
    accentBg: 'bg-purple-600',
    fileHint: 'following.json or data export',
  },
  youtube: {
    name: 'YouTube',
    icon: Video,
    color: 'from-red-600 to-red-700',
    accentBg: 'bg-red-600',
    fileHint: 'subscriptions.csv or Takeout ZIP',
  },
};

export default function PlatformSelector() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {Object.entries(PLATFORMS).map(([key, p]) => {
        const PlatformIcon = p.icon;
        const isEnabled = key === 'tiktok';
        return (
          <div
            key={key}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              isEnabled
                ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg cursor-pointer'
                : 'border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed'
            }`}
            title={isEnabled ? `Upload ${p.name} data` : 'Coming soon'}
          >
            <PlatformIcon className={`w-8 h-8 mx-auto mb-2 ${isEnabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-700'}`} />
            <div className="text-sm font-medium text-center text-gray-900 dark:text-gray-100">
              {p.name}
            </div>
            {!isEnabled && (
              <div className="absolute top-2 right-2">
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  Soon
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}