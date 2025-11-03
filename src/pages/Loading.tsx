import { Search } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { PLATFORMS } from "../constants/platforms";

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
  onNavigate: (step: 'home' | 'login') => void;
  searchProgress: SearchProgress;
  currentStep: string;
}

export default function LoadingPage({ session, onLogout, onNavigate, searchProgress, currentStep }: LoadingPageProps) {
  // Default to TikTok styling for loading state
  const platform = PLATFORMS.tiktok;
  const PlatformIcon = platform.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AppHeader session={session} onLogout={onLogout} onNavigate={onNavigate} currentStep={currentStep} />
      
      {/* Platform Banner - Searching State */}
      <div className={`bg-gradient-to-r ${platform.color} text-white`}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <PlatformIcon className="w-12 h-12" />
                <Search className="w-6 h-6 absolute -bottom-1 -right-1 animate-pulse" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Finding Your People</h2>
                <p className="text-white/90 text-sm">
                  Searching the ATmosphere...
                </p>
              </div>
            </div>
            {searchProgress.found > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold">{searchProgress.found}</div>
                <div className="text-xs text-white/80">found</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100" aria-label={`${searchProgress.searched} searched`}>
                {searchProgress.searched}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Searched</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" aria-label={`${searchProgress.found} found`}>
                {searchProgress.found}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Found</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400 dark:text-gray-500" aria-label={`${searchProgress.total} total`}>
                {searchProgress.total}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total</div>
            </div>
          </div>

          <div 
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3" 
            role="progressbar" 
            aria-valuenow={searchProgress.total > 0 ? Math.round((searchProgress.searched / searchProgress.total) * 100) : 0} 
            aria-valuemin={0} 
            aria-valuemax={100}
          >
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all"
              style={{ width: `${searchProgress.total > 0 ? (searchProgress.searched / searchProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Skeleton Results - Matches layout of Results page */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden animate-pulse">
            {/* Source User Skeleton */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                </div>
                <div className="h-5 w-16 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
            </div>
            
            {/* Match Skeleton */}
            <div className="p-4">
              <div className="flex items-start space-x-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-5 w-20 bg-green-200 dark:bg-green-900 rounded-full mt-2" />
                </div>
                <div className="w-20 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}