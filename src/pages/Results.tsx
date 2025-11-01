import { Video, Heart } from "lucide-react";
import AppHeader from "../components/AppHeader";
import SearchResultCard from "../components/SearchResultCard";

interface atprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

interface TikTokUser {
  username: string;
  date: string;
}

interface SearchResult {
  tiktokUser: TikTokUser;
  atprotoMatches: any[];
  isSearching: boolean;
  error?: string;
  selectedMatches?: Set<string>;
}

interface ResultsPageProps {
  session: atprotoSession | null;
  onLogout: () => void;
  onNavigate: (step: 'home' | 'login') => void;
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
  currentStep
}: ResultsPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-24">
      <AppHeader session={session} onLogout={onLogout} onNavigate={onNavigate} currentStep={currentStep} />
      
      {/* Platform Info Banner */}
      <div className="bg-gradient-to-r from-black via-gray-800 to-cyan-400 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Video className="w-12 h-12" />
              <div>
                <h2 className="text-xl font-bold">TikTok Matches</h2>
                <p className="text-white/90 text-sm">
                  {totalFound} matches from {searchResults.length} follows
                </p>
              </div>
            </div>
            {totalSelected > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold">{totalSelected}</div>
                <div className="text-xs text-white/80">selected</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex space-x-2">
          <button
            onClick={onSelectAll}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="button"
          >
            Select All
          </button>
          <button
            onClick={onDeselectAll}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Feed Results */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {searchResults.map((result, idx) => (
          <SearchResultCard
            key={idx}
            result={result}
            resultIndex={idx}
            isExpanded={expandedResults.has(idx)}
            onToggleExpand={() => onToggleExpand(idx)}
            onToggleMatchSelection={(did) => onToggleMatchSelection(idx, did)}
          />
        ))}
      </div>

      {/* Fixed Bottom Action Bar */}
      {totalSelected > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent pt-8 pb-6">
          <div className="max-w-3xl mx-auto px-4">
            <button
              onClick={onFollowSelected}
              disabled={isFollowing}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white py-5 rounded-2xl font-bold text-lg transition-all shadow-2xl hover:shadow-3xl flex items-center justify-center space-x-3 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800"
            >
              <Heart className="w-6 h-6" />
              <span>Follow {totalSelected} Selected {totalSelected === 1 ? 'User' : 'Users'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}