import { Upload, History, Settings, BookOpen, Grid3x3, ChevronRight, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AppHeader from "../components/AppHeader";
import PlatformSelector from "../components/PlatformSelector";
import SetupWizard from "../components/SetupWizard";
import { apiClient } from "../lib/apiClient";
import { ATPROTO_APPS } from "../constants/atprotoApps";
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
  onNavigate: (step: 'home' | 'login') => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, platform: string) => void;
  onLoadUpload: (uploadId: string) => void;
  currentStep: string;
  userSettings: UserSettings;
  onSettingsUpdate: (settings: Partial<UserSettings>) => void;
  // New props from changes.js
  reducedMotion?: boolean;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onToggleMotion?: () => void;
}

type TabId = 'upload' | 'history' | 'settings' | 'guides' | 'apps';

export default function HomePage({ 
  session, 
  onLogout, 
  onNavigate, 
  onFileUpload, 
  onLoadUpload,
  currentStep,
  userSettings,
  onSettingsUpdate,
  // New props
  reducedMotion = false,
  isDark = false,
  onToggleTheme,
  onToggleMotion
}: HomePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) {
      loadUploads();
    }
    
    // Show wizard on first visit
    if (!userSettings.wizardCompleted) {
      setShowWizard(true);
    }
  }, [session, userSettings.wizardCompleted]);

  async function loadUploads() {
    try {
      setIsLoading(true);
      const data = await apiClient.getUploads();
      setUploads(data.uploads);
    } catch (error) {
      console.error('Failed to load uploads:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform);
    fileInputRef.current?.click();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      tiktok: 'from-black via-gray-800 to-cyan-400',
      twitter: 'from-blue-400 to-blue-600',
      instagram: 'from-pink-500 via-purple-500 to-orange-500',
    };
    return colors[platform] || 'from-gray-400 to-gray-600';
  };

  const tabs = [
    { id: 'upload' as TabId, icon: Upload, label: 'Upload' },
    { id: 'history' as TabId, icon: History, label: 'History' },
    { id: 'settings' as TabId, icon: Settings, label: 'Settings' },
    { id: 'guides' as TabId, icon: BookOpen, label: 'Guides' },
    { id: 'apps' as TabId, icon: Grid3x3, label: 'Apps' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <SetupWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={onSettingsUpdate}
        currentSettings={userSettings}
      />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto">
          <div className="overflow-x-auto scrollbar-hide px-4">
            <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 min-w-max">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Setup Assistant Banner - Only show if wizard not completed */}
            {!userSettings.wizardCompleted && (
              <div className="bg-firefly-banner dark:bg-firefly-banner-dark rounded-2xl p-6 text-white">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Need help getting started?</h2>
                    <p className="text-white/90">Run the setup assistant to configure your preferences in minutes.</p>
                  </div>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-all flex items-center space-x-2 whitespace-nowrap shadow-lg"
                  >
                    <span>Start Setup</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-firefly-amber via-firefly-orange to-firefly-pink rounded-xl flex items-center justify-center shadow-md">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Upload Following Data
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Find your people on the ATmosphere
                    </p>
                  </div>
                </div>
                {userSettings.wizardCompleted && (
                  <button
                    onClick={() => setShowWizard(true)}
                    className="text-sm text-firefly-orange hover:text-firefly-pink font-medium transition-colors flex items-center space-x-1"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Reconfigure</span>
                  </button>
                )}
              </div>
              
              <PlatformSelector onPlatformSelect={handlePlatformSelect} />
              
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".txt,.json,.html,.zip"
                onChange={(e) => onFileUpload(e, selectedPlatform || 'tiktok')}
                className="sr-only"
                aria-label="Upload following data file"
              />
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-lg p-6 border-2 border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3 mb-6">
                <Sparkles className="w-6 h-6 text-firefly-amber" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Your Light Trail
                </h2>
              </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : uploads.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">No previous uploads yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                  Upload your first file to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploads.map((upload) => {
                  const destApp = ATPROTO_APPS[userSettings.platformDestinations[upload.sourcePlatform as keyof typeof userSettings.platformDestinations]];
                  return (
                    <button
                      key={upload.uploadId}
                      onClick={() => onLoadUpload(upload.uploadId)}
                      className="w-full flex items-start space-x-4 p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/70 rounded-xl transition-all text-left border-2 border-slate-200 dark:border-slate-700 hover:border-firefly-orange dark:hover:border-firefly-orange shadow-md hover:shadow-lg"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-r ${getPlatformColor(upload.sourcePlatform)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                            {upload.sourcePlatform}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs px-2 py-0.5 bg-firefly-amber/20 dark:bg-firefly-amber/30 text-amber-900 dark:text-firefly-glow rounded-full font-medium border border-firefly-amber/20 dark:border-firefly-amber/50 whitespace-nowrap">
                              {upload.matchedUsers} {upload.matchedUsers === 1 ? 'firefly' : 'fireflies'}
                            </span>
                            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                              {Math.round((upload.matchedUsers / upload.totalUsers) * 100)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          {upload.totalUsers} users • {formatDate(upload.createdAt)}
                        </div>
                        {destApp && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Sent to {destApp.icon} {destApp.name}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsPage
            userSettings={userSettings}
            onSettingsUpdate={onSettingsUpdate}
            onOpenWizard={() => setShowWizard(true)}
          />
        )}

        {/* Guides Tab - Placeholder */}
        {activeTab === 'guides' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <BookOpen className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Platform Guides</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Export guides coming soon...</p>
          </div>
        )}

        {/* Apps Tab - Placeholder */}
        {activeTab === 'apps' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Grid3x3 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">ATmosphere Apps</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Apps directory coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}