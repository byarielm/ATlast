import { useState, useEffect, useCallback } from "react";
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
import { useNotifications } from "./hooks/useNotifications";
import Firefly from "./components/Firefly";
import NotificationContainer from "./components/common/NotificationContainer";
import { DEFAULT_SETTINGS } from "./types/settings";
import type { UserSettings, SearchResult } from "./types";
import { apiClient } from "./lib/api/client";
import { ATPROTO_APPS } from "./config/atprotoApps";

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

  // Notifications hook (replaces alerts)
  const { notifications, removeNotification, success, error, info } =
    useNotifications();

  // Theme hook
  const { isDark, reducedMotion, toggleTheme, toggleMotion } = useTheme();

  // Current platform state
  const [currentPlatform, setCurrentPlatform] = useState<string>("tiktok");

  // Track saved uploads to prevent duplicates
  const [savedUploads, setSavedUploads] = useState<Set<string>>(new Set());

  // Settings state
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem("atlast_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("atlast_settings", JSON.stringify(userSettings));
  }, [userSettings]);

  const handleSettingsUpdate = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setUserSettings((prev) => ({ ...prev, ...newSettings }));
    },
    [],
  );

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

  // Save results handler (proper state management)
  const saveResults = useCallback(
    async (uploadId: string, platform: string, results: SearchResult[]) => {
      if (!userSettings.saveData) {
        console.log("Data storage disabled - skipping save to database");
        return;
      }

      if (savedUploads.has(uploadId)) {
        console.log("Upload already saved:", uploadId);
        return;
      }

      try {
        setSavedUploads((prev) => new Set(prev).add(uploadId));
        await apiClient.saveResults(uploadId, platform, results);
        console.log("Results saved successfully:", uploadId);
      } catch (err) {
        console.error("Background save failed:", err);
        setSavedUploads((prev) => {
          const next = new Set(prev);
          next.delete(uploadId);
          return next;
        });
      }
    },
    [userSettings.saveData, savedUploads],
  );

  // File upload handler
  const { handleFileUpload: processFileUpload } = useFileUpload(
    (initialResults, platform) => {
      setCurrentPlatform(platform);
      setSearchResults(initialResults);
      setCurrentStep("loading");

      const uploadId = crypto.randomUUID();
      const followLexicon =
        ATPROTO_APPS[currentDestinationAppId]?.followLexicon;

      searchAllUsers(
        initialResults,
        setStatusMessage,
        () => {
          setCurrentStep("results");

          // Save results after search completes
          setTimeout(() => {
            setSearchResults((currentResults) => {
              if (currentResults.length > 0) {
                saveResults(uploadId, platform, currentResults);
              }
              return currentResults;
            });
          }, 1000);
        },
        followLexicon,
      );
    },
    setStatusMessage,
    userSettings,
  );

  // Load previous upload handler
  const handleLoadUpload = useCallback(
    async (uploadId: string) => {
      try {
        setStatusMessage("Loading previous upload...");
        setCurrentStep("loading");

        const data = await apiClient.getUploadDetails(uploadId);

        if (data.results.length === 0) {
          setSearchResults([]);
          setCurrentPlatform("tiktok");
          setCurrentStep("home");
          info("No previous results found.");
          return;
        }

        const platform = "tiktok";
        setCurrentPlatform(platform);

        const loadedResults: SearchResult[] = data.results.map((result) => ({
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
        success(`Loaded ${loadedResults.length} results from previous upload`);
      } catch (err) {
        console.error("Failed to load upload:", err);
        error("Failed to load previous upload. Please try again.");
        setCurrentStep("home");
      }
    },
    [setStatusMessage, setCurrentStep, setSearchResults, info, error, success],
  );

  // Login handler
  const handleLogin = useCallback(
    async (handle: string) => {
      if (!handle?.trim()) {
        error("Please enter your handle");
        return;
      }

      try {
        await login(handle);
      } catch (err) {
        console.error("OAuth error:", err);
        const errorMsg = `Error starting OAuth: ${err instanceof Error ? err.message : "Unknown error"}`;
        setStatusMessage(errorMsg);
        error(errorMsg);
      }
    },
    [login, error, setStatusMessage],
  );

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setSearchResults([]);
      setCurrentPlatform("tiktok");
      setSavedUploads(new Set());
      success("Logged out successfully");
    } catch (err) {
      error("Failed to logout. Please try again.");
    }
  }, [logout, setSearchResults, success, error]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Notification Container */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />

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
              <div className="w-16 h-16 bg-firefly-banner dark:bg-firefly-banner-dark text-white rounded-2xl mx-auto flex items-center justify-center">
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
            reducedMotion={reducedMotion}
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
