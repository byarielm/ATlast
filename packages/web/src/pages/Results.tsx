import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import AppHeader from "../components/AppHeader";
import SearchResultCard from "../components/SearchResultCard";
import FaviconIcon from "../components/FaviconIcon";
import type { AtprotoAppId, AtprotoSession, SearchResult } from "../types";
import { getPlatform, getAtprotoApp } from "../lib/utils/platform";
import VirtualizedResultsList from "../components/VirtualizedResultsList";
import Button from "../components/common/Button";

interface ResultsPageProps {
  session: AtprotoSession | null;
  onLogout: () => void;
  onNavigate: (step: "home" | "login") => void;
  searchResults: SearchResult[];
  expandedResults: Set<number>;
  onToggleExpand: (index: number) => void;
  onToggleMatchSelection: (resultIndex: number, did: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFollowSelected: () => void;
  totalSelected: number;
  totalFound: number;
  isFollowing: boolean;
  currentStep: string;
  sourcePlatform: string;
  destinationAppId: AtprotoAppId;
  reducedMotion?: boolean;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onToggleMotion?: () => void;
}

export default function ResultsPage({
  session,
  onLogout,
  onNavigate,
  searchResults,
  expandedResults,
  onToggleExpand,
  onToggleMatchSelection,
  onSelectAll,
  onDeselectAll,
  onFollowSelected,
  totalSelected,
  totalFound,
  isFollowing,
  currentStep,
  sourcePlatform,
  destinationAppId,
  reducedMotion = false,
  isDark = false,
  onToggleTheme,
  onToggleMotion,
}: ResultsPageProps) {
  const platform = getPlatform(sourcePlatform);
  const destinationApp = getAtprotoApp(destinationAppId);
  const PlatformIcon = platform.icon;

  // Memoize sorted results to avoid re-sorting on every render
  const sortedResults = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      // 1. Users with matches first
      const aHasMatches = a.atprotoMatches.length > 0 ? 0 : 1;
      const bHasMatches = b.atprotoMatches.length > 0 ? 0 : 1;
      if (aHasMatches !== bHasMatches) return aHasMatches - bHasMatches;

      // 2. For matched users, sort by highest posts count of their top match
      if (a.atprotoMatches.length > 0 && b.atprotoMatches.length > 0) {
        const aTopPosts = a.atprotoMatches[0]?.postCount || 0;
        const bTopPosts = b.atprotoMatches[0]?.postCount || 0;
        if (aTopPosts !== bTopPosts) return bTopPosts - aTopPosts;

        // 3. Then by followers count
        const aTopFollowers = a.atprotoMatches[0]?.followerCount || 0;
        const bTopFollowers = b.atprotoMatches[0]?.followerCount || 0;
        if (aTopFollowers !== bTopFollowers)
          return bTopFollowers - aTopFollowers;
      }

      // 4. Username as tiebreaker
      return a.sourceUser.username.localeCompare(b.sourceUser.username);
    });
  }, [searchResults]);

  return (
    <div className="min-h-screen pb-24">
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

      {/* Platform Info Banner */}
      <div className="relative overflow-hidden bg-firefly-banner text-white dark:bg-firefly-banner-dark">
        {!reducedMotion && (
          <div className="absolute inset-0 opacity-20" aria-hidden="true">
            {[...Array(10)].map((_, i) => {
              const animations = [
                "animate-float-1",
                "animate-float-2",
                "animate-float-3",
              ];
              return (
                <div
                  key={i}
                  className={`absolute size-1 rounded-full bg-white ${animations[i % 3]}`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                />
              );
            })}
          </div>
        )}
        <div className="relative mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur">
                <Sparkles className="size-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {totalFound} Connections Found!
                </h2>
                <p className="text-sm text-white/95">
                  From {searchResults.length} {platform.name} follows
                </p>
              </div>
            </div>
            {totalSelected > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold">{totalSelected}</div>
                <div className="text-xs font-medium">selected</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky top-0 z-10 border-b-2 border-cyan-500/30 bg-white/95 backdrop-blur-sm dark:border-purple-500/30 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl space-x-2 px-4 py-3">
          <Button onClick={onSelectAll} variant="primary" className="flex-1">
            Select All
          </Button>
          <Button
            onClick={onDeselectAll}
            variant="secondary"
            className="flex-1"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Feed Results */}
      <div className="mx-auto max-w-3xl p-4">
        <VirtualizedResultsList
          results={sortedResults}
          expandedResults={expandedResults}
          onToggleExpand={onToggleExpand}
          onToggleMatchSelection={onToggleMatchSelection}
          sourcePlatform={sourcePlatform}
          destinationAppId={destinationAppId}
        />
      </div>

      {/* Fixed Bottom Action Bar */}
      {totalSelected > 0 && (
        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-white via-white to-transparent pb-6 pt-8 dark:from-slate-900 dark:via-slate-900 dark:to-transparent">
          <div className="mx-auto max-w-3xl px-4">
            <button
              onClick={onFollowSelected}
              disabled={isFollowing}
              className="hover:shadow-3xl flex w-full items-center justify-center space-x-3 rounded-2xl bg-firefly-banner py-5 text-lg font-bold text-white shadow-2xl transition-all hover:scale-105 hover:from-amber-600 hover:via-orange-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:bg-firefly-banner-dark"
            >
              <FaviconIcon
                url={destinationApp.icon}
                alt={destinationApp.name}
                className="size-5"
                useButtonStyling={true}
              />
              <span>
                Light Up {totalSelected} Connection
                {totalSelected === 1 ? "" : "s"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
