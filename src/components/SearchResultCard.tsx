import { Video, MessageCircle, Check, UserPlus, ChevronDown } from "lucide-react";
import { PLATFORMS } from "../constants/platforms";
import type { SearchResult, AtprotoMatch, SourceUser } from '../types';


interface SearchResultCardProps {
  result: SearchResult;
  resultIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleMatchSelection: (did: string) => void;
  sourcePlatform: string;
}

export default function SearchResultCard({ 
  result, 
  resultIndex, 
  isExpanded, 
  onToggleExpand, 
  onToggleMatchSelection,
  sourcePlatform
}: SearchResultCardProps) {
  const displayMatches = isExpanded ? result.atprotoMatches : result.atprotoMatches.slice(0, 1);
  const hasMoreMatches = result.atprotoMatches.length > 1;
  const platform = PLATFORMS[sourcePlatform] || PLATFORMS.tiktok;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Source User */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-base">
                @{result.sourceUser.username}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                from {platform.name}
              </span>
            </div>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full bg-indigo-700 dark:bg-pink-700/70 text-white whitespace-nowrap flex-shrink-0`}>
            {result.atprotoMatches.length} {result.atprotoMatches.length === 1 ? 'match' : 'matches'}
          </div>
        </div>
      </div>

      {/* ATProto Matches */}
      <div className="p-4">
        {result.atprotoMatches.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Not found on the ATmosphere yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayMatches.map((match) => {
              const isFollowed = match.followed;
              const isSelected = result.selectedMatches?.has(match.did);
              return (
                <div
                  key={match.did}
                  className="flex items-start space-x-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                >
                  {/* Avatar */}
                  {match.avatar ? (
                    <img 
                      src={match.avatar} 
                      alt="User avatar"
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">
                        {match.handle.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Match Info */}
                  <div className="flex-1 min-w-0">
                    {match.displayName && (
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {match.displayName}
                      </div>
                    )}
                    <a 
                      href={`https://bsky.app/profile/${match.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      @{match.handle}
                    </a>
                    {match.description && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{match.description}</div>
                    )}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-700 dark:text-gray-300">
                      {match.postCount && match.postCount > 0 && (
                        <span>{match.postCount.toLocaleString()} posts</span>
                      )}
                      {match.followerCount && match.followerCount > 0 && (
                        <span>{match.followerCount.toLocaleString()} followers</span>
                      )}
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded-full font-medium">
                        {match.matchScore}% match
                      </span>
                    </div>
                  </div>

                  {/* Select/Follow Button */}
                  <button
                    onClick={() => onToggleMatchSelection(match.did)}
                    disabled={isFollowed}
                    className={`p-2 rounded-full font-medium transition-all flex-shrink-0 ${
                      isFollowed
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-cyan-500 dark:bg-cyan-300 text-white dark:text-slate-700 shadow-md'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    title={isFollowed ? 'Already followed' : isSelected ? 'Selected to follow' : 'Select to follow'}
                  >
                    {isFollowed ? (
                      <Check className="w-4 h-4" />
                    ) : isSelected ? (
                      <Check className="w-4 h-4" />
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
                className="w-full py-2 text-sm text-cyan-700 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-200 font-medium transition-colors flex items-center justify-center space-x-1"
              >
                <span>{isExpanded ? 'Show less' : `Show ${result.atprotoMatches.length - 1} more ${result.atprotoMatches.length - 1 === 1 ? 'option' : 'options'}`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}