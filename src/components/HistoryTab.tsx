import { Upload, Sparkles, ChevronRight } from "lucide-react";
import { ATPROTO_APPS } from "../constants/atprotoApps";
import type { Upload as UploadType } from "../types";
import type { UserSettings } from "../types/settings";

interface HistoryTabProps {
  uploads: UploadType[];
  wizardCompleted: boolean;
  onShowWizard: () => void;
  isLoading: boolean;
  userSettings: UserSettings;
  onLoadUpload: (uploadId: string) => void;
}

export default function HistoryTab({
  uploads,
  wizardCompleted,
  onShowWizard,
  isLoading,
  userSettings,
  onLoadUpload,
}: HistoryTabProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      tiktok: "from-black via-gray-800 to-cyan-400",
      twitter: "from-blue-400 to-blue-600",
      instagram: "from-pink-500 via-purple-500 to-orange-500",
    };
    return colors[platform] || "from-gray-400 to-gray-600";
  };

  return (
    <div className="p-6 mb-3">
      {/* Setup Assistant Banner - Only show if wizard not completed */}
      {!wizardCompleted && (
        <div className="bg-firefly-banner-dark dark:bg-firefly-banner-dark rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                Need help getting started?
              </h2>
              <p className="text-white">
                Run the setup assistant to configure your preferences in
                minutes.
              </p>
            </div>
            <button
              onClick={onShowWizard}
              className="bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-all flex items-center space-x-2 whitespace-nowrap shadow-lg"
            >
              <span>Start Setup</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
            Previously Uploaded
          </h2>
          <p className="text-sm text-purple-750 dark:text-cyan-250">
            Reconnect with your light trail
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center space-x-4 p-4 bg-purple-100/50 dark:bg-slate-900/50 rounded-xl border-2 border-purple-500/30 dark:border-cyan-500/30"
            >
              <div className="w-12 h-12 bg-purple-200 dark:bg-slate-600 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-purple-200 dark:bg-slate-600 rounded w-3/4" />
                <div className="h-3 bg-purple-200 dark:bg-slate-600 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-12">
          <Upload className="w-16 h-16 text-purple-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-purple-750 dark:text-cyan-250 font-medium">
            No previous uploads yet
          </p>
          <p className="text-sm text-purple-750/70 dark:text-cyan-250/70 mt-2">
            Upload your first file to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {uploads.map((upload) => {
            const destApp =
              ATPROTO_APPS[
                userSettings.platformDestinations[
                  upload.sourcePlatform as keyof typeof userSettings.platformDestinations
                ]
              ];
            return (
              <button
                key={upload.uploadId}
                onClick={() => onLoadUpload(upload.uploadId)}
                className="w-full flex items-start space-x-4 p-4 bg-purple-100/20 dark:bg-slate-900/50 hover:bg-purple-100/40 dark:hover:bg-slate-900/70 rounded-xl transition-all text-left border-2 border-orange-650/50 dark:border-amber-400/50 hover:border-orange-500 dark:hover:border-amber-400 shadow-md hover:shadow-lg"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${getPlatformColor(upload.sourcePlatform)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-1">
                    <div className="font-semibold text-purple-950 dark:text-cyan-50 capitalize leading-tight">
                      {upload.sourcePlatform}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-purple-750 dark:text-cyan-250 whitespace-nowrap flex-shrink-0">
                        {upload.matchedUsers}{" "}
                        {upload.matchedUsers === 1 ? "match" : "matches"}
                      </span>
                    </div>
                  </div>
                  {destApp && (
                    <a
                      href={destApp.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-750 dark:text-cyan-250 hover:underline leading-tight"
                    >
                      {destApp.action} on {destApp.icon} {destApp.name}
                    </a>
                  )}
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-slate-900 text-purple-950 dark:text-cyan-50 font-medium">
                      {upload.totalUsers}{" "}
                      {upload.totalUsers === 1 ? "user found" : "users found"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-slate-900 text-purple-950 dark:text-cyan-50 font-medium">
                      Uploaded {formatDate(upload.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
