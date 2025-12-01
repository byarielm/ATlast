import {
  MessageCircle,
  Check,
  UserPlus,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import type { SearchResult } from "../types";
import { getAtprotoAppWithFallback } from "../lib/utils/platform";
import type { AtprotoAppId } from "../types/settings";
import AvatarWithFallback from "./common/AvatarWithFallback";

interface SearchResultCardProps {
  result: SearchResult;
  resultIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleMatchSelection: (did: string) => void;
  sourcePlatform: string;
  destinationAppId?: AtprotoAppId;
}

export default function SearchResultCard({
  result,
  resultIndex,
  isExpanded,
  onToggleExpand,
  onToggleMatchSelection,
  sourcePlatform,
  destinationAppId = "bluesky",
}: SearchResultCardProps) {
  const displayMatches = isExpanded
    ? result.atprotoMatches
    : result.atprotoMatches.slice(0, 1);
  const hasMoreMatches = result.atprotoMatches.length > 1;
  const currentApp = getAtprotoAppWithFallback(destinationAppId);
  const currentLexicon = currentApp?.followLexicon || "app.bsky.graph.follow";

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
          <div
            className={`text-sm text-purple-750 dark:text-cyan-250 whitespace-nowrap flex-shrink-0`}
          >
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
        <div className="">
          {displayMatches.map((match) => {
            // Check follow status for current lexicon
            const isFollowedInCurrentApp =
              match.followStatus?.[currentLexicon] ?? match.followed ?? false;
            const isSelected = result.selectedMatches?.has(match.did);

            return (
              <div
                key={match.did}
                className="flex items-start gap-3 p-3 cursor-pointer hover:scale-[1.01] transition-transform"
              >
                {/* Avatar */}
                <AvatarWithFallback
                  avatar={match.avatar}
                  handle={match.handle || ""}
                  size="sm"
                />

                {/* Match Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Name and Handle */}
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

                  {/* User Stats and Match Percent */}
                  <div className="flex items-center flex-wrap gap-2">
                    {typeof match.postCount === "number" &&
                      match.postCount > 0 && (
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

                  {/* Description */}
                  {match.description && (
                    <div className="text-sm text-purple-900 dark:text-cyan-100 line-clamp-2 pt-1">
                      {match.description}
                    </div>
                  )}
                </div>

                {/* Select/Follow Button */}
                <button
                  onClick={() => onToggleMatchSelection(match.did)}
                  disabled={isFollowedInCurrentApp}
                  className={`p-2 rounded-full font-medium transition-all flex-shrink-0 self-start ${
                    isFollowedInCurrentApp
                      ? "bg-purple-100 dark:bg-slate-900 border-2 border-purple-500 dark:border-cyan-500 text-purple-950 dark:text-cyan-50 shadow-md cursor-not-allowed opacity-50"
                      : isSelected
                        ? "bg-purple-100 dark:bg-slate-900 border-2 border-purple-500 dark:border-cyan-500 text-purple-950 dark:text-cyan-50 shadow-md"
                        : "bg-slate-200/50 dark:bg-slate-900/50 border-2 border-cyan-500/30 dark:border-purple-500/30 text-purple-750 dark:text-cyan-250 hover:border-orange-500 dark:hover:border-amber-400"
                  }`}
                  title={
                    isFollowedInCurrentApp
                      ? `Already following on ${currentApp?.name || "this app"}`
                      : isSelected
                        ? "Selected to follow"
                        : "Select to follow"
                  }
                >
                  {isFollowedInCurrentApp ? (
                    <Check className="w-4 h-4" />
                  ) : isSelected ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>
              </div>
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
}
