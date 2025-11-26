import { Twitter, Instagram, Video, Hash, Gamepad2 } from "lucide-react";
import { PLATFORMS } from "../constants/platforms";

interface PlatformSelectorProps {
  onPlatformSelect: (platform: string) => void;
}

export default function PlatformSelector({
  onPlatformSelect,
}: PlatformSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                ? "bg-purple-100/20 dark:bg-slate-900/50 hover:bg-purple-100/40 dark:hover:bg-slate-900/70 border-orange-500/50 dark:border-amber-400/50 hover:border-amber-400 dark:hover:border-amber-400/80 hover:shadow-lg cursor-pointer"
                : "border-cyan-500/30 dark:border-purple-500/30 opacity-50 cursor-not-allowed bg-slate-100/30 dark:bg-slate-900/30"
            }`}
            title={isEnabled ? `Upload ${p.name} data` : "Coming soon"}
          >
            <PlatformIcon
              className={`w-8 h-8 mx-auto mb-2 ${isEnabled ? "text-purple-750 dark:text-cyan-250" : "text-purple-750/50 dark:text-cyan-250/50"}`}
            />
            <div className="text-sm font-medium text-center text-purple-900 dark:text-cyan-100">
              {p.name}
            </div>
            {!isEnabled && (
              <div className="absolute top-2 right-2">
                <span className="text-xs bg-purple-100 dark:bg-cyan-900 text-purple-600 dark:text-cyan-400 px-2 py-0.5 rounded-full">
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
