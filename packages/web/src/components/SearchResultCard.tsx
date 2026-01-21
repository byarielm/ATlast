import React, { useMemo } from "react";
import { MessageCircle, ChevronDown } from "lucide-react";
import type { SearchResult } from "../types";
import { getAtprotoAppWithFallback } from "../lib/utils/platform";
import type { AtprotoAppId } from "../types/settings";
import AvatarWithFallback from "./common/AvatarWithFallback";
import FollowButton from "./common/FollowButton";
import Badge from "./common/Badge";
import { StatBadge } from "./common/Stats";
import Card from "./common/Card";
import CardItem from "./common/CardItem";

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
    <CardItem
      padding="p-3"
      badgeIndentClass="sm:pl-[44px]"
      avatar={
        <AvatarWithFallback
          avatar={match.avatar}
          handle={match.handle || ""}
          size="sm"
        />
      }
      content={
        <>
          {match.displayName && (
            <div className="font-semibold leading-tight text-purple-950 dark:text-cyan-50">
              {match.displayName}
            </div>
          )}
          <a
            href={`https://bsky.app/profile/${match.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm leading-tight text-purple-750 hover:underline dark:text-cyan-250"
          >
            @{match.handle}
          </a>
        </>
      }
      action={
        <FollowButton
          isFollowed={isFollowed}
          isSelected={isSelected}
          onToggle={onToggle}
          appName={currentAppName}
        />
      }
      badges={
        <>
          {typeof match.postCount === "number" && match.postCount > 0 && (
            <StatBadge value={match.postCount} label="posts" />
          )}
          {typeof match.followerCount === "number" &&
            match.followerCount > 0 && (
              <StatBadge value={match.followerCount} label="followers" />
            )}
          <Badge variant="match">{match.matchScore}% match</Badge>
        </>
      }
      description={match.description}
    />
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
      [destinationAppId]
    );

    const currentLexicon = useMemo(
      () => currentApp?.followLexicon || "app.bsky.graph.follow",
      [currentApp]
    );

    const displayMatches = useMemo(
      () =>
        isExpanded ? result.atprotoMatches : result.atprotoMatches.slice(0, 1),
      [isExpanded, result.atprotoMatches]
    );

    const hasMoreMatches = result.atprotoMatches.length > 1;

    return (
      <Card variant="result">
        {/* Source User */}
        <div className="border-b-2 border-cyan-500/30 bg-purple-100 px-4 py-3 dark:border-purple-500/30 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="truncate text-base font-bold text-purple-950 dark:text-cyan-50">
                  @{result.sourceUser.username}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 whitespace-nowrap text-sm text-purple-750 dark:text-cyan-250">
              {result.atprotoMatches.length}{" "}
              {result.atprotoMatches.length === 1 ? "match" : "matches"}
            </div>
          </div>
        </div>

        {/* ATProto Matches */}
        {result.atprotoMatches.length === 0 ? (
          <div className="py-6 text-center">
            <MessageCircle className="mx-auto mb-2 size-8 text-purple-750 opacity-50 dark:text-cyan-250" />
            <p className="text-sm text-purple-950 dark:text-cyan-50">
              Not found on the ATmosphere yet
            </p>
          </div>
        ) : (
          <div>
            {displayMatches.map((match) => {
              const isFollowedInCurrentApp =
                match.followStatus?.[currentLexicon] ?? false;
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
                className="flex w-full items-center justify-center space-x-1 border-t-2 border-cyan-500/30 py-2 text-sm font-medium text-purple-600 transition-colors hover:border-orange-500 hover:text-purple-950 dark:border-purple-500/30 dark:text-cyan-400 dark:hover:border-amber-400/50 dark:hover:text-cyan-50"
              >
                <span>
                  {isExpanded
                    ? "Show less"
                    : `Show ${result.atprotoMatches.length - 1} more ${result.atprotoMatches.length - 1 === 1 ? "option" : "options"}`}
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
        )}
      </Card>
    );
  }
);

SearchResultCard.displayName = "SearchResultCard";
export default SearchResultCard;
