import { Twitter, Instagram, Video, Hash, Gamepad2 } from "lucide-react";
import { PLATFORMS } from "../constants/platforms";

interface PlatformSelectorProps {
  onPlatformSelect: (platform: string) => void;
}

export default function PlatformSelector({ onPlatformSelect }: PlatformSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {Object.entries(PLATFORMS).map(([key, p]) => {
        const PlatformIcon = p.icon;
        const isEnabled = p.enabled;
        return (
          <button
            key={key}
            onClick={() => isEnabled && onPlatformSelect(key)}
            disabled={!isEnabled}
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
          </button>
        );
      })}
    </div>
  );
}