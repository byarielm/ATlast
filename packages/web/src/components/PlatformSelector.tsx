import { PLATFORMS } from "../config/platforms";

interface PlatformSelectorProps {
  onPlatformSelect: (platform: string) => void;
}

export default function PlatformSelector({
  onPlatformSelect,
}: PlatformSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Object.entries(PLATFORMS).map(([key, p]) => {
        const PlatformIcon = p.icon;
        const isEnabled = p.enabled;
        return (
          <button
            key={key}
            onClick={() => isEnabled && onPlatformSelect(key)}
            disabled={!isEnabled}
            className={`relative rounded-xl border-2 p-4 transition-all ${
              isEnabled
                ? "cursor-pointer border-orange-500/50 bg-purple-100/20 hover:border-amber-400 hover:bg-purple-100/40 hover:shadow-lg dark:border-amber-400/50 dark:bg-slate-900/50 dark:hover:border-amber-400/80 dark:hover:bg-slate-900/70"
                : "cursor-not-allowed border-cyan-500/30 bg-slate-100/30 opacity-50 dark:border-purple-500/30 dark:bg-slate-900/30"
            }`}
            title={isEnabled ? `Upload ${p.name} data` : "Coming soon"}
          >
            <PlatformIcon
              className={`mx-auto mb-2 size-6 ${isEnabled ? "text-purple-750 dark:text-cyan-250" : "text-purple-750/50 dark:text-cyan-250/50"}`}
            />
            <div className="text-center text-sm font-medium text-purple-900 dark:text-cyan-100">
              {p.name}
            </div>
            {!isEnabled && (
              <div className="absolute right-2 top-2">
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-600 dark:bg-cyan-900 dark:text-cyan-400">
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
