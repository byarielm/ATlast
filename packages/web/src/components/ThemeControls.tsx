import { Sun, Moon, Pause, Play } from "lucide-react";

interface ThemeControlsProps {
  isDark: boolean;
  reducedMotion: boolean;
  onToggleTheme: () => void;
  onToggleMotion: () => void;
}

export default function ThemeControls({
  isDark,
  reducedMotion,
  onToggleTheme,
  onToggleMotion,
}: ThemeControlsProps) {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onToggleMotion}
        className="rounded-lg border border-slate-200 bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-700"
        aria-label={reducedMotion ? "Enable animations" : "Reduce motion"}
        title={reducedMotion ? "Enable animations" : "Reduce motion"}
      >
        {reducedMotion ? (
          <Play className="size-5 text-slate-700 dark:text-slate-300" />
        ) : (
          <Pause className="size-5 text-slate-700 dark:text-slate-300" />
        )}
      </button>
      <button
        onClick={onToggleTheme}
        className="rounded-lg border border-slate-200 bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-700"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun className="size-5 text-firefly-amber" />
        ) : (
          <Moon className="size-5 text-slate-700" />
        )}
      </button>
    </div>
  );
}
