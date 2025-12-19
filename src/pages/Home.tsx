import { BookOpen, Grid3x3 } from "lucide-react";
import { useState, useEffect } from "react";
import AppHeader from "../components/AppHeader";
import SetupWizard from "../components/SetupWizard";
import TabNavigation, { TabId } from "../components/TabNavigation";
import UploadTab from "../components/UploadTab";
import HistoryTab from "../components/HistoryTab";
import PlaceholderTab from "../components/PlaceholderTab";
import { apiClient } from "../lib/api/client";
import type { Upload as UploadType } from "../types";
import type { UserSettings } from "../types/settings";
import SettingsPage from "./Settings";

interface atprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

interface HomePageProps {
  session: atprotoSession | null;
  onLogout: () => void;
  onNavigate: (step: "home" | "login") => void;
  onFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    platform: string,
  ) => void;
  onLoadUpload: (uploadId: string) => void;
  currentStep: string;
  userSettings: UserSettings;
  onSettingsUpdate: (settings: Partial<UserSettings>) => void;
  reducedMotion?: boolean;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onToggleMotion?: () => void;
}

export default function HomePage({
  session,
  onLogout,
  onNavigate,
  onFileUpload,
  onLoadUpload,
  currentStep,
  userSettings,
  onSettingsUpdate,
  reducedMotion = false,
  isDark = false,
  onToggleTheme,
  onToggleMotion,
}: HomePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (session) {
      loadUploads();
    }

    // Show wizard on first visit
    if (!userSettings.wizardCompleted) {
      setShowWizard(true);
    }
  }, [session, userSettings.wizardCompleted]);

  // Reload uploads when navigating to history tab
  useEffect(() => {
    if (activeTab === "history" && session) {
      loadUploads();
    }
  }, [activeTab, session]);

  async function loadUploads() {
    try {
      setIsLoading(true);
      const data = await apiClient.getUploads();
      setUploads(data.uploads);
    } catch (error) {
      console.error("Failed to load uploads:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SetupWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={onSettingsUpdate}
        currentSettings={userSettings}
      />

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-cyan-500/50 dark:border-purple-500/50 overflow-x-auto">
        <AppHeader
          session={session}
          onLogout={onLogout}
          onNavigate={onNavigate}
          currentStep={currentStep}
          isDark={isDark}
          reducedMotion={reducedMotion}
          onToggleTheme={onToggleTheme}
          onToggleMotion={onToggleMotion}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl p-3 border-2 border-cyan-500/30 dark:border-purple-500/30 mb-8">
          {/* Tab Navigation */}
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          <div>
            {activeTab === "upload" && (
              <UploadTab
                wizardCompleted={userSettings.wizardCompleted}
                onShowWizard={() => setShowWizard(true)}
                onPlatformSelect={setSelectedPlatform}
                onFileUpload={onFileUpload}
                selectedPlatform={selectedPlatform}
              />
            )}

            {activeTab === "history" && (
              <HistoryTab
                wizardCompleted={userSettings.wizardCompleted}
                onShowWizard={() => setShowWizard(true)}
                uploads={uploads}
                isLoading={isLoading}
                userSettings={userSettings}
                onLoadUpload={onLoadUpload}
              />
            )}

            {activeTab === "settings" && (
              <SettingsPage
                userSettings={userSettings}
                onSettingsUpdate={onSettingsUpdate}
                onOpenWizard={() => setShowWizard(true)}
              />
            )}

            {activeTab === "guides" && (
              <PlaceholderTab
                icon={BookOpen}
                title="Platform Guides"
                message="Export guides coming soon..."
              />
            )}

            {activeTab === "apps" && (
              <PlaceholderTab
                icon={Grid3x3}
                title="ATmosphere Apps"
                message="Apps directory coming soon..."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
