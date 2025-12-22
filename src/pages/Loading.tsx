import AppHeader from "../components/AppHeader";
import { SearchResultSkeleton } from "../components/common/LoadingSkeleton";
import { getPlatform } from "../lib/utils/platform";

interface atprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

interface SearchProgress {
  searched: number;
  found: number;
  total: number;
}

interface LoadingPageProps {
  session: atprotoSession | null;
  onLogout: () => void;
  onNavigate: (step: "home" | "login") => void;
  searchProgress: SearchProgress;
  currentStep: string;
  sourcePlatform: string;
  isDark?: boolean;
  reducedMotion?: boolean;
  onToggleTheme?: () => void;
  onToggleMotion?: () => void;
}

export default function LoadingPage({
  session,
  onLogout,
  onNavigate,
  searchProgress,
  currentStep,
  sourcePlatform,
  isDark = false,
  reducedMotion = false,
  onToggleTheme,
  onToggleMotion,
}: LoadingPageProps) {
  const platform = getPlatform(sourcePlatform);
  const PlatformIcon = platform.icon;

  return (
    <div className="min-h-screen">
      <AppHeader
        session={session}
        onLogout={onLogout}
        onNavigate={onNavigate}
        currentStep={currentStep}
        isDark={isDark}
        reducedMotion={reducedMotion}
        onToggleTheme={onToggleTheme}
        onToggleMotion={onToggleMotion}
      />

      {/* Platform Banner - Searching State */}
      <div
        className={`bg-firefly-banner dark:bg-firefly-banner-dark text-white`}
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative w-12 h-12">
                <PlatformIcon className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Finding Your Fireflies</h2>
                <p className="text-white text-sm">
                  Searching the ATmosphere for {platform.name} follows...
                </p>
              </div>
            </div>
            {searchProgress.found > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold">{searchProgress.found}</div>
                <div className="text-xs text-white">found</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="bg-white/95 dark:bg-slate-900 border-b-2 border-cyan-500/30 dark:border-purple-500/30 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div
                className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                aria-label={`${searchProgress.searched} searched`}
              >
                {searchProgress.searched}
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Searched
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-bold text-orange-500 dark:text-amber-400"
                aria-label={`${searchProgress.found} found`}
              >
                {searchProgress.found}
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Fireflies Found
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-bold text-slate-600 dark:text-slate-400"
                aria-label={`${searchProgress.total} total`}
              >
                {searchProgress.total}
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Total
              </div>
            </div>
          </div>

          <div
            className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3"
            role="progressbar"
            aria-valuenow={
              searchProgress.total > 0
                ? Math.round(
                    (searchProgress.searched / searchProgress.total) * 100,
                  )
                : 0
            }
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="bg-firefly-banner dark:bg-firefly-banner-dark h-full rounded-full transition-all"
              style={{
                width: `${searchProgress.total > 0 ? (searchProgress.searched / searchProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Skeleton Results - Matches layout of Results page */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {[...Array(8)].map((_, i) => (
          <SearchResultSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
