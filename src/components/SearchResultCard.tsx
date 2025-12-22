import React, { useMemo } from "react";
import { MessageCircle, ChevronDown } from "lucide-react";
import type { SearchResult } from "../types";
import { getAtprotoAppWithFallback } from "../lib/utils/platform";
import type { AtprotoAppId } from "../types/settings";
import AvatarWithFallback from "./common/AvatarWithFallback";
import FollowButton from "./common/FollowButton";

interface SearchResultCardProps {
  result: SearchResult;
  resultIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleMatchSelection: (did: string) => void;
  sourcePlatform: string;
  destinationAppId?: AtprotoAppId;
}

// Memoize the match item to prevent unnecessary re-renders
const MatchItem = React.memo<{
  match: any;
  isSelected: boolean;
  isFollowed: boolean;
  currentAppName: string;
  onToggle: () => void;
}>(({ match, isSelected, isFollowed, currentAppName, onToggle }) => {
  return (
    <div className="flex items-start gap-3 p-3 cursor-pointer hover:scale-[1.01] transition-transform">
      <AvatarWithFallback
        avatar={match.avatar}
        handle={match.handle || ""}
        size="sm"
      />

      <div className="flex-1 min-w-0 space-y-1">
        <div>
          {match.displayName && (
            <div className="font-semibold text-purple-950 dark:text-cyan-50 leading-tight">
              {match.displayName}
            </div>
          )}
          <a
            href={`https://bsky.app/profile/${match.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-750 dark:text-cyan-250 hover:underline leading-tight"
          >
            @{match.handle}
          </a>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {typeof match.postCount === "number" && match.postCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-slate-900 text-purple-950 dark:text-cyan-50 font-medium">
              {match.postCount.toLocaleString()} posts
            </span>
          )}
          {typeof match.followerCount === "number" &&
            match.followerCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-slate-900 text-purple-950 dark:text-cyan-50 font-medium">
                {match.followerCount.toLocaleString()} followers
              </span>
            )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-slate-900 text-purple-950 dark:text-cyan-50 font-medium">
            {match.matchScore}% match
          </span>
        </div>

        {match.description && (
          <div className="text-sm text-purple-900 dark:text-cyan-100 line-clamp-2 pt-1">
            {match.description}
          </div>
        )}
      </div>

      <FollowButton
        isFollowed={isFollowed}
        isSelected={isSelected}
        onToggle={onToggle}
        appName={currentAppName}
      />
    </div>
  );
});

MatchItem.displayName = "MatchItem";

const SearchResultCard = React.memo<SearchResultCardProps>(
  ({
    result,
    resultIndex,
    isExpanded,
    onToggleExpand,
    onToggleMatchSelection,
    sourcePlatform,
    destinationAppId = "bluesky",
  }) => {
    const currentApp = useMemo(
      () => getAtprotoAppWithFallback(destinationAppId),
      [destinationAppId],
    );

    const currentLexicon = useMemo(
      () => currentApp?.followLexicon || "app.bsky.graph.follow",
      [currentApp],
    );

    const displayMatches = useMemo(
      () =>
        isExpanded ? result.atprotoMatches : result.atprotoMatches.slice(0, 1),
      [isExpanded, result.atprotoMatches],
    );

    const hasMoreMatches = result.atprotoMatches.length > 1;

    return (
      <div className="bg-white/50 dark:bg-slate-900/50 rounded-2xl shadow-sm overflow-hidden border-2 border-cyan-500/30 dark:border-purple-500/30">
        {/* Source User */}
        <div className="px-4 py-3 bg-purple-100 dark:bg-slate-900 border-b-2 border-cyan-500/30 dark:border-purple-500/30">
          <div className="flex justify-between gap-2 items-center">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="font-bold text-purple-950 dark:text-cyan-50 truncate text-base">
                  @{result.sourceUser.username}
                </span>
              </div>
            </div>
            <div className="text-sm text-purple-750 dark:text-cyan-250 whitespace-nowrap flex-shrink-0">
              {result.atprotoMatches.length}{" "}
              {result.atprotoMatches.length === 1 ? "match" : "matches"}
            </div>
          </div>
        </div>

        {/* ATProto Matches */}
        {result.atprotoMatches.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-purple-750 dark:text-cyan-250" />
            <p className="text-sm text-purple-950 dark:text-cyan-50">
              Not found on the ATmosphere yet
            </p>
          </div>
        ) : (
          <div>
            {displayMatches.map((match) => {
              const isFollowedInCurrentApp =
                match.followStatus?.[currentLexicon] ?? match.followed ?? false;
              const isSelected = result.selectedMatches?.has(match.did);

              return (
                <MatchItem
                  key={match.did}
                  match={match}
                  isSelected={isSelected || false}
                  isFollowed={isFollowedInCurrentApp}
                  currentAppName={currentApp?.name || "this app"}
                  onToggle={() => onToggleMatchSelection(match.did)}
                />
              );
            })}
            {hasMoreMatches && (
              <button
                onClick={onToggleExpand}
                className="w-full py-2 text-sm text-purple-600 hover:text-purple-950 dark:text-cyan-400 dark:hover:text-cyan-50 font-medium transition-colors flex items-center justify-center space-x-1 border-t-2 border-cyan-500/30 dark:border-purple-500/30 hover:border-orange-500 dark:hover:border-amber-400/50"
              >
                <span>
                  {isExpanded
                    ? "Show less"
                    : `Show ${result.atprotoMatches.length - 1} more ${result.atprotoMatches.length - 1 === 1 ? "option" : "options"}`}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);
SearchResultCard.displayName = "SearchResultCard";
export default SearchResultCard;
