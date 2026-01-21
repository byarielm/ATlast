import AppHeader from "../components/AppHeader";
import { SearchResultSkeleton } from "../components/common/LoadingSkeleton";
import { getPlatform } from "../lib/utils/platform";
import { StatsGroup } from "../components/common/Stats";
import ProgressBar from "../components/common/ProgressBar";
import PlatformBadge from "../components/common/PlatformBadge";

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

  const statsData = [
    {
      value: searchProgress.searched,
      label: "Searched",
      variant: "default" as const,
    },
    {
      value: searchProgress.found,
      label: "Fireflies Found",
      variant: "highlight" as const,
    },
    { value: searchProgress.total, label: "Total", variant: "muted" as const },
  ];

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
        className={`bg-firefly-banner text-white dark:bg-firefly-banner-dark`}
      >
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <PlatformBadge
                platformKey={sourcePlatform}
                showName={false}
                size="lg"
              />
              <div>
                <h2 className="text-xl font-bold">Finding Your Fireflies</h2>
                <p className="text-sm text-white">
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
      <div className="border-b-2 border-cyan-500/30 bg-white/95 backdrop-blur-sm dark:border-purple-500/30 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl p-4">
          <StatsGroup stats={statsData} className="mb-4 grid-cols-3" />

          <ProgressBar
            current={searchProgress.searched}
            total={searchProgress.total}
            variant="search"
          />
        </div>
      </div>

      {/* Skeleton Results - Matches layout of Results page */}
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {[...Array(8)].map((_, i) => (
          <SearchResultSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
