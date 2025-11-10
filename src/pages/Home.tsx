import { Upload, History, FileText, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AppHeader from "../components/AppHeader";
import PlatformSelector from "../components/PlatformSelector";
import { apiClient } from "../lib/apiClient";
import type { Upload as UploadType } from "../types";

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
  reducedMotion = false,
  isDark = false,
  onToggleTheme,
  onToggleMotion
}: HomePageProps) {
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) {
      loadUploads();
    }
  }, [session]);

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
    // Trigger the file input
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

  return (
    <div className="min-h-screen">
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

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Upload Section */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-lg p-6 border-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div 
              className={`w-12 h-12 bg-gradient-to-br from-firefly-amber to-firefly-orange rounded-xl flex items-center justify-center shadow-md ${
                reducedMotion ? '' : 'animate-glow-pulse'
              }`}
            >
              <Upload className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Light Up Your Network
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Upload your data to find your fireflies
              </p>
            </div>
          </div>
          <p className="text-slate-700 dark:text-slate-300 mb-6">
            Click a platform below to upload your exported data and discover matches in the ATmosphere
          </p>
  
          <PlatformSelector onPlatformSelect={handlePlatformSelect} />
          
          {/* Hidden file input */}
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept=".txt,.json,.html,.zip"
            onChange={(e) => onFileUpload(e, selectedPlatform || 'tiktok')}
            className="sr-only"
            aria-label="Upload following data file"
          />
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800/30">
            <p className="text-sm text-blue-900 dark:text-blue-300 font-semibold">
              💡 How to get your data:
            </p>
            <p className="text-sm text-blue-900 dark:text-blue-300 mt-2">
              <strong>TikTok:</strong> Profile → Settings → Account → Download your data → Upload Following.txt
            </p>
            <p className="text-sm text-blue-900 dark:text-blue-300 mt-1">
              <strong>Instagram:</strong> Profile → Settings → Accounts Center → Your information and permissions → Download your information → Upload following.html
            </p>
          </div>
        </div>

        {/* Upload History Section */}
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
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">No previous uploads yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Upload your first file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
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
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}