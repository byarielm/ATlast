import { useState } from "react";
import { ArrowRight } from "lucide-react";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import LoadingPage from "./pages/Loading";
import ResultsPage from "./pages/Results";
import { apiClient } from "./lib/apiClient";
import { useAuth } from "./hooks/useAuth";
import { useSearch } from "./hooks/useSearch";
import { useFollow } from "./hooks/useFollows";
import { useFileUpload } from "./hooks/useFileUpload";

export default function App() {
  // Auth hook
  const {
    session,
    currentStep,
    statusMessage,
    setCurrentStep,
    setStatusMessage,
    login,
    logout,
  } = useAuth();

  // Add state to track current platform
  const [currentPlatform, setCurrentPlatform] = useState<string>('tiktok');

  // Search hook
  const {
    searchResults,
    setSearchResults,
    isSearchingAll,
    searchProgress,
    expandedResults,
    searchAllUsers,
    toggleMatchSelection,
    toggleExpandResult,
    selectAllMatches,
    deselectAllMatches,
    totalSelected,
    totalFound,
  } = useSearch(session);

  // Follow hook
  const {
    isFollowing,
    followSelectedUsers,
  } = useFollow(session, searchResults, setSearchResults);

  // File upload hook
  const {
    handleFileUpload: processFileUpload,
  } = useFileUpload(
    (initialResults, platform) => {
      setCurrentPlatform(platform);

      const resultsWithPlatform = initialResults.map(res => ({
        ...res,
        sourcePlatform: platform,
      }));
      
      setSearchResults(resultsWithPlatform);
      setCurrentStep('loading');
      searchAllUsers(
        resultsWithPlatform,
        setStatusMessage,
        () => {
          setCurrentStep('results');
          // Save results after search completes (only once)
          const uploadId = crypto.randomUUID();
          apiClient.saveResults(uploadId, platform, resultsWithPlatform);
        }
      );
    },
    setStatusMessage
  );

  // Load previous upload handler
  const handleLoadUpload = async (uploadId: string) => {
    try {
      setStatusMessage('Loading previous upload...');
      setCurrentStep('loading');
      
      const data = await apiClient.getUploadDetails(uploadId);
      
      if (data.results.length === 0){
        setSearchResults([]);
        setCurrentPlatform('tiktok');
        setCurrentStep('home');
        setStatusMessage('No previous results found.');
        return;
      }

      const platform = 'tiktok'; // Default, will be updated when we add platform to upload details
      setCurrentPlatform(platform);
      
      // Convert the loaded results to SearchResult format with selectedMatches
      const loadedResults = data.results.map(result => ({
        ...result,
        sourcePlatform: platform,
        isSearching: false,
        selectedMatches: new Set<string>(
          result.atprotoMatches
            .filter(match => !match.followed)
            .slice(0, 1)
            .map(match => match.did)
        ),
      }));
      
      setSearchResults(loadedResults);
      setCurrentStep('results');
      setStatusMessage(`Loaded ${loadedResults.length} results from previous upload`);
    } catch (error) {
      console.error('Failed to load upload:', error);
      setStatusMessage('Failed to load previous upload');
      setCurrentStep('home');
      alert('Failed to load previous upload. Please try again.');
    }
  };

  // Login handler
  const handleLogin = async (handle: string) => {
    if (!handle?.trim()) {
      setStatusMessage("Please enter your handle");
      alert("Please enter your handle");
      return;
    }
    
    try {
      await login(handle);
    } catch (err) {
      console.error('OAuth error:', err);
      const errorMsg = `Error starting OAuth: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setStatusMessage(errorMsg);
      alert(errorMsg);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      setSearchResults([]);
      setCurrentPlatform('tiktok');
    } catch (error) {
      alert('Failed to logout. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      <main id="main-content">
        {/* Checking Session */}
        {currentStep === 'checking' && (
          <div className="p-6 max-w-md mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Loading...</h2>
              <p className="text-gray-600 dark:text-gray-300">Checking your session</p>
            </div>
          </div>
        )}

        {/* Login Page */}
        {currentStep === 'login' && (
          <LoginPage 
            onSubmit={handleLogin}
          />
        )}

        {/* Home/Dashboard Page */}
        {currentStep === 'home' && (
          <HomePage
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentStep}
            onFileUpload={processFileUpload}
            onLoadUpload={handleLoadUpload}
            currentStep={currentStep}
          />
        )}

        {/* Loading Page */}
        {currentStep === 'loading' && (
          <LoadingPage
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentStep}
            searchProgress={searchProgress}
            currentStep={currentStep}
          />
        )}

        {/* Results Page */}
        {currentStep === 'results' && (
          <ResultsPage
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentStep}
            searchResults={searchResults}
            expandedResults={expandedResults}
            onToggleExpand={toggleExpandResult}
            onToggleMatchSelection={toggleMatchSelection}
            onSelectAll={() => selectAllMatches(setStatusMessage)}
            onDeselectAll={() => deselectAllMatches(setStatusMessage)}
            onFollowSelected={() => followSelectedUsers(setStatusMessage)}
            totalSelected={totalSelected}
            totalFound={totalFound}
            isFollowing={isFollowing}
            currentStep={currentStep}
            sourcePlatform={currentPlatform}
          />
        )}
      </main>
    </div>
  );
}