import { Upload, Sparkles, ChevronRight, Database } from "lucide-react";
import { ATPROTO_APPS } from "../config/atprotoApps";
import type { Upload as UploadType } from "../types";
import FaviconIcon from "../components/FaviconIcon";
import type { UserSettings } from "../types/settings";
import { UploadHistorySkeleton } from "./common/LoadingSkeleton";
import { getPlatformColor } from "../lib/utils/platform";
import { formatRelativeTime } from "../lib/utils/date";
import EmptyState from "./common/EmptyState";
import SetupPrompt from "./common/SetupPrompt";
import Card from "./common/Card";
import Badge from "./common/Badge";

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
  return (
    <div className="p-6">
      {/* Setup Assistant Banner - Only show if wizard not completed */}
      {!wizardCompleted && (
        <SetupPrompt
          variant="banner"
          isCompleted={wizardCompleted}
          onShowWizard={onShowWizard}
        />
      )}

      <div className="flex items-center space-x-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
            Previously Uploaded
          </h2>
          <p className="text-sm text-purple-750 dark:text-cyan-250">
            Reconnect with your light trail
          </p>
        </div>
      </div>

      {/* Data Storage Disabled Notice */}
      {!userSettings.saveData && (
        <Card className="mb-4 p-4 border-orange-650/50 dark:border-amber-400/50 bg-purple-100/50 dark:bg-slate-900/50">
          <div className="flex items-start space-x-3">
            <Database className="w-5 h-5 text-orange-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-950 dark:text-cyan-50 mb-1">
                Data Storage Disabled
              </h3>
              <p className="text-sm text-purple-900 dark:text-cyan-100">
                You've disabled data storage in your settings. Enable "Save my
                data" in the Settings tab to save your upload history.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <UploadHistorySkeleton key={i} />
          ))}
        </div>
      ) : uploads.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No previous uploads yet"
          message="Upload your first file to get started"
        />
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
              <Card
                key={upload.uploadId}
                variant="upload"
                onClick={() => onLoadUpload(upload.uploadId)}
                className="w-full flex items-start space-x-4 p-4"
              >
                <div
                  className={`w-10 h-10 bg-gradient-to-r ${getPlatformColor(upload.sourcePlatform)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}
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
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-purple-750 dark:text-cyan-250 hover:underline leading-tight flex items-center space-x-1 w-fit"
                    >
                      <span>{destApp.action} on</span>

                      <FaviconIcon
                        url={destApp.icon}
                        alt={destApp.name}
                        className="w-3 h-3 mb-0.5 flex-shrink-0"
                      />

                      <span>{destApp.name}</span>
                    </a>
                  )}
                  <div className="flex items-center flex-wrap gap-2 py-1.5 sm:ml-0 -ml-14">
                    <Badge variant="info">
                      {upload.totalUsers}{" "}
                      {upload.totalUsers === 1 ? "user found" : "users found"}
                    </Badge>
                    <Badge variant="info">
                      Uploaded {formatRelativeTime(upload.createdAt)}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
