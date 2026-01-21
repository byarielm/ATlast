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
import CardItem from "./common/CardItem";

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

      <div className="mb-4 flex items-center space-x-3">
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
        <Card className="mb-4 border-orange-650/50 bg-purple-100/50 p-4 dark:border-amber-400/50 dark:bg-slate-900/50">
          <div className="flex items-start space-x-3">
            <Database className="mt-0.5 size-5 flex-shrink-0 text-orange-600 dark:text-amber-400" />
            <div>
              <h3 className="mb-1 font-semibold text-purple-950 dark:text-cyan-50">
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
              <Card key={upload.uploadId} variant="upload" className="w-full">
                <CardItem
                  padding="p-4"
                  badgeIndentClass="sm:pl-[56px]"
                  onClick={() => onLoadUpload(upload.uploadId)}
                  avatar={
                    <div
                      className={`size-10 bg-gradient-to-r ${getPlatformColor(upload.sourcePlatform)} flex flex-shrink-0 items-center justify-center rounded-xl shadow-md`}
                    >
                      <Sparkles className="size-6 text-white" />
                    </div>
                  }
                  content={
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="font-semibold capitalize leading-tight text-purple-950 dark:text-cyan-50">
                          {upload.sourcePlatform}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <span className="flex-shrink-0 whitespace-nowrap text-sm text-purple-750 dark:text-cyan-250">
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
                          className="flex w-fit items-center space-x-1 text-sm leading-tight text-purple-750 hover:underline dark:text-cyan-250"
                        >
                          <span>{destApp.action} on</span>

                          <FaviconIcon
                            url={destApp.icon}
                            alt={destApp.name}
                            className="mb-0.5 size-3 flex-shrink-0"
                          />

                          <span>{destApp.name}</span>
                        </a>
                      )}
                    </>
                  }
                  badges={
                    <>
                      <Badge variant="info">
                        {upload.totalUsers}{" "}
                        {upload.totalUsers === 1 ? "user found" : "users found"}
                      </Badge>
                      <Badge variant="info">
                        {formatRelativeTime(upload.createdAt)}
                      </Badge>
                    </>
                  }
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
