import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import AppHeader from "../components/AppHeader";
import SearchResultCard from "../components/SearchResultCard";
import FaviconIcon from "../components/FaviconIcon";
import type { AtprotoAppId } from "../types/settings";
import { getPlatform, getAtprotoApp } from "../lib/utils/platform";
import VirtualizedResultsList from "../components/VirtualizedResultsList";
import Button from "../components/common/Button";

interface atprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

interface SourceUser {
  username: string;
  date: string;
}

interface SearchResult {
  sourceUser: SourceUser;
  atprotoMatches: any[];
  isSearching: boolean;
  error?: string;
  selectedMatches?: Set<string>;
  sourcePlatform: string;
}

interface ResultsPageProps {
  session: atprotoSession | null;
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
      <div className="bg-firefly-banner dark:bg-firefly-banner-dark text-white relative overflow-hidden">
        {!reducedMotion && (
          <div className="absolute inset-0 opacity-20" aria-hidden="true">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${2 + Math.random()}s ease-in-out infinite`,
                  animationDelay: `${Math.random()}s`,
                }}
              />
            ))}
          </div>
        )}
        <div className="max-w-3xl mx-auto px-4 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {totalFound} Connections Found!
                </h2>
                <p className="text-white/95 text-sm">
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
      <div className="bg-white/95 dark:bg-slate-900 border-b-2 border-cyan-500/30 dark:border-purple-500/30 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex space-x-2">
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
      <div className="max-w-3xl mx-auto px-4 py-4">
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
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 dark:to-transparent pt-8 pb-6">
          <div className="max-w-3xl mx-auto px-4">
            <button
              onClick={onFollowSelected}
              disabled={isFollowing}
              className="w-full bg-firefly-banner dark:bg-firefly-banner-dark text-white hover:from-amber-600 hover:via-orange-600 hover:to-pink-600 py-5 rounded-2xl font-bold text-lg transition-all shadow-2xl hover:shadow-3xl flex items-center justify-center space-x-3 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <FaviconIcon
                url={destinationApp.icon}
                alt={destinationApp.name}
                className="w-5 h-5"
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
