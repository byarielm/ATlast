import { useState, useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import LoadingPage from "./pages/Loading";
import ResultsPage from "./pages/Results";
import { useAuth } from "./hooks/useAuth";
import { useSearch } from "./hooks/useSearch";
import { useFollow } from "./hooks/useFollows";
import { useFileUpload } from "./hooks/useFileUpload";
import { useTheme } from "./hooks/useTheme";
import Firefly from "./components/Firefly";
import { DEFAULT_SETTINGS } from "./types/settings";
import type { UserSettings } from "./types/settings";
import { apiClient } from "./lib/api/client";
import { ATPROTO_APPS } from "./config/atprotoApps";

export default function App() {
  // Auth hook :)
  const {
    session,
    currentStep,
    statusMessage,
    setCurrentStep,
    setStatusMessage,
    login,
    logout,
  } = useAuth();

  // Theme hook
  const { isDark, reducedMotion, toggleTheme, toggleMotion } = useTheme();

  // Add state to track current platform
  const [currentPlatform, setCurrentPlatform] = useState<string>("tiktok");
  const saveCalledRef = useRef<string | null>(null); // Track by uploadId

  // Settings state
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem("atlast_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("atlast_settings", JSON.stringify(userSettings));
  }, [userSettings]);

  const handleSettingsUpdate = (newSettings: Partial<UserSettings>) => {
    setUserSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Search hook
  const {
    searchResults,
    setSearchResults,
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

  const currentDestinationAppId =
    userSettings.platformDestinations[
      currentPlatform as keyof UserSettings["platformDestinations"]
    ];

  // Follow hook
  const { isFollowing, followSelectedUsers } = useFollow(
    session,
    searchResults,
    setSearchResults,
    currentDestinationAppId,
  );

  // File upload hook
  const { handleFileUpload: processFileUpload } = useFileUpload(
    (initialResults, platform) => {
      setCurrentPlatform(platform);

      setSearchResults(initialResults);
      setCurrentStep("loading");

      const uploadId = crypto.randomUUID();
      const followLexicon =
        ATPROTO_APPS[currentDestinationAppId]?.followLexicon;

      searchAllUsers(initialResults, setStatusMessage, () => {
        setCurrentStep("results");

        // CONDITIONAL SAVE: Only save if user has enabled data storage
        if (userSettings.saveData) {
          // Prevent duplicate saves
          if (saveCalledRef.current !== uploadId) {
            saveCalledRef.current = uploadId;
            // Need to wait for React to finish updating searchResults state
            // Use a longer delay and access via setSearchResults callback to get final state
            setTimeout(() => {
              setSearchResults((currentResults) => {
                if (currentResults.length > 0) {
                  apiClient
                    .saveResults(uploadId, platform, currentResults)
                    .catch((err) => {
                      console.error("Background save failed:", err);
                    });
                }
                return currentResults; // Don't modify, just return as-is
              });
            }, 1000); // Longer delay to ensure all state updates complete
          }
        } else {
          console.log("Data storage disabled - skipping save to database");
        }
      });
    },
    setStatusMessage,
    userSettings, // Pass userSettings to hook
  );

  // Load previous upload handler
  const handleLoadUpload = async (uploadId: string) => {
    try {
      setStatusMessage("Loading previous upload...");
      setCurrentStep("loading");

      const data = await apiClient.getUploadDetails(uploadId);

      if (data.results.length === 0) {
        setSearchResults([]);
        setCurrentPlatform("tiktok");
        setCurrentStep("home");
        setStatusMessage("No previous results found.");
        return;
      }

      const platform = "tiktok"; // Default, will be updated when we add platform to upload details
      setCurrentPlatform(platform);
      saveCalledRef.current = null;

      // Convert the loaded results to SearchResult format with selectedMatches
      const loadedResults = data.results.map((result) => ({
        ...result,
        sourcePlatform: platform,
        isSearching: false,
        selectedMatches: new Set<string>(
          result.atprotoMatches
            .filter((match) => !match.followed)
            .slice(0, 1)
            .map((match) => match.did),
        ),
      }));

      setSearchResults(loadedResults);
      setCurrentStep("results");
      setStatusMessage(
        `Loaded ${loadedResults.length} results from previous upload`,
      );
    } catch (error) {
      console.error("Failed to load upload:", error);
      setStatusMessage("Failed to load previous upload");
      setCurrentStep("home");
      alert("Failed to load previous upload. Please try again.");
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
      console.error("OAuth error:", err);
      const errorMsg = `Error starting OAuth: ${err instanceof Error ? err.message : "Unknown error"}`;
      setStatusMessage(errorMsg);
      alert(errorMsg);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      setSearchResults([]);
      setCurrentPlatform("tiktok");
    } catch (error) {
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Firefly particles - only render if motion not reduced */}
      {!reducedMotion && (
        <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
          {[...Array(15)].map((_, i) => (
            <Firefly key={i} delay={i * 0.5} duration={3 + Math.random() * 2} />
          ))}
        </div>
      )}

      {/* Status message for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-firefly-orange focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      <main id="main-content">
        {/* Checking Session */}
        {currentStep === "checking" && (
          <div className="p-6 max-w-md mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center space-y-4">
              <div className="w-16 h-16 bbg-firefly-banner dark:bg-firefly-banner-dark text-white rounded-2xl mx-auto flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Loading...
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Checking your session
              </p>
            </div>
          </div>
        )}

        {/* Login Page */}
        {currentStep === "login" && (
          <LoginPage
            onSubmit={handleLogin}
            session={session}
            onNavigate={setCurrentStep}
            reducedMotion={reducedMotion}
          />
        )}

        {/* Home/Dashboard Page */}
        {currentStep === "home" && (
          <HomePage
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentStep}
            onFileUpload={processFileUpload}
            onLoadUpload={handleLoadUpload}
            currentStep={currentStep}
            reducedMotion={reducedMotion}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onToggleMotion={toggleMotion}
            userSettings={userSettings}
            onSettingsUpdate={handleSettingsUpdate}
          />
        )}

        {/* Loading Page */}
        {currentStep === "loading" && (
          <LoadingPage
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentStep}
            searchProgress={searchProgress}
            currentStep={currentStep}
            sourcePlatform={currentPlatform}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onToggleMotion={toggleMotion}
          />
        )}

        {/* Results Page */}
        {currentStep === "results" && (
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
            destinationAppId={currentDestinationAppId}
            reducedMotion={reducedMotion}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onToggleMotion={toggleMotion}
          />
        )}
      </main>
    </div>
  );
}
