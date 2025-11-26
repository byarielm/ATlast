import { Upload, ChevronRight, Settings } from "lucide-react";
import { useRef } from "react";
import PlatformSelector from "../components/PlatformSelector";

interface UploadTabProps {
  wizardCompleted: boolean;
  onShowWizard: () => void;
  onPlatformSelect: (platform: string) => void;
  onFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    platform: string,
  ) => void;
  selectedPlatform: string;
}

export default function UploadTab({
  wizardCompleted,
  onShowWizard,
  onPlatformSelect,
  onFileUpload,
  selectedPlatform,
}: UploadTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePlatformSelect = (platform: string) => {
    onPlatformSelect(platform);
    fileInputRef.current?.click();
  };

  return (
    <div className="p-6">
      {/* Setup Assistant Banner - Only show if wizard not completed */}
      {!wizardCompleted && (
        <div className="bg-firefly-banner dark:bg-firefly-banner-dark rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                Need help getting started?
              </h2>
              <p className="text-white/90">
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

      {/* Upload Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
                Upload Following Data
              </h2>
              <p className="text-sm text-purple-750 dark:text-cyan-250">
                Find your people on the ATmosphere
              </p>
            </div>
          </div>
          {wizardCompleted && (
            <button
              onClick={onShowWizard}
              className="text-sm text-orange-650 hover:text-orange-500 dark:text-amber-400 dark:hover:text-amber-300 font-medium transition-colors flex items-center space-x-1"
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
          onChange={(e) => onFileUpload(e, selectedPlatform || "tiktok")}
          className="sr-only"
          aria-label="Upload following data file"
        />
      </div>
    </div>
  );
}
