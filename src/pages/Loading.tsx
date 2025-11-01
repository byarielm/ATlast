import { Search } from "lucide-react";
import AppHeader from "../components/AppHeader";

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
  return (
    <div>
      <AppHeader session={session} onLogout={onLogout} onNavigate={onNavigate} currentStep={currentStep} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Search className="w-8 h-8 text-white animate-pulse" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Finding Your People</h2>
            <p className="text-gray-600 dark:text-gray-300">Searching the ATmosphere for your follows...</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100" aria-label={`${searchProgress.searched} searched`}>{searchProgress.searched}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Searched</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" aria-label={`${searchProgress.found} found`}>{searchProgress.found}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Found</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-400 dark:text-gray-500" aria-label={`${searchProgress.total} total`}>{searchProgress.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total</div>
              </div>
            </div>

            <div className="w-full bg-gray-200 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3" role="progressbar" aria-valuenow={searchProgress.total > 0 ? Math.round((searchProgress.searched / searchProgress.total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all"
                style={{ width: `${searchProgress.total > 0 ? (searchProgress.searched / searchProgress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}