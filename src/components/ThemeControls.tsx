import { Sun, Moon, Pause, Play } from 'lucide-react';

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
  onToggleMotion 
}: ThemeControlsProps) {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onToggleMotion}
        className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-lg"
        aria-label={reducedMotion ? "Enable animations" : "Reduce motion"}
        title={reducedMotion ? "Enable animations" : "Reduce motion"}
      >
        {reducedMotion ? (
          <Play className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        ) : (
          <Pause className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        )}
      </button>
      <button
        onClick={onToggleTheme}
        className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-lg"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-firefly-amber" />
        ) : (
          <Moon className="w-5 h-5 text-slate-700" />
        )}
      </button>
    </div>
  );
}