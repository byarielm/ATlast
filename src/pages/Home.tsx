import { Upload, History, FileText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AppHeader from "../components/AppHeader";
import PlatformSelector from "../components/PlatformSelector";
import FileUploadZone from "../components/FileUploadZone";
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
}

export default function HomePage({ 
  session, 
  onLogout, 
  onNavigate, 
  onFileUpload, 
  onLoadUpload,
  currentStep 
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AppHeader session={session} onLogout={onLogout} onNavigate={onNavigate} currentStep={currentStep} />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Upload Following Data
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upload your exported data from any platform to find matches on the ATmosphere
          </p>
  
          <PlatformSelector onPlatformSelect={handlePlatformSelect} />
          <FileUploadZone 
            onFileChange={(e) => onFileUpload(e, selectedPlatform || 'tiktok')} 
            fileInputRef={fileInputRef} />
        </div>

        {/* Upload History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Previous Uploads
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No previous uploads yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Upload your first file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <button
                  key={upload.uploadId}
                  onClick={() => onLoadUpload(upload.uploadId)}
                  className="w-full flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors text-left"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${getPlatformColor(upload.sourcePlatform)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                        {upload.sourcePlatform}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                        {upload.matchedUsers} matches
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {upload.totalUsers} users • {formatDate(upload.createdAt)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    <div className="font-medium">{Math.round((upload.matchedUsers / upload.totalUsers) * 100)}%</div>
                    <div className="text-xs">match rate</div>
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