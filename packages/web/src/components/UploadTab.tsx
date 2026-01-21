import { Settings } from "lucide-react";
import { useRef } from "react";
import PlatformSelector from "../components/PlatformSelector";
import SetupPrompt from "./common/SetupPrompt";
import Section from "./common/Section";

interface UploadTabProps {
  wizardCompleted: boolean;
  onShowWizard: () => void;
  onPlatformSelect: (platform: string) => void;
  onFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    platform: string
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
    <Section
      title="Upload Following Data"
      description="Find your people in the ATmosphere"
      action={
        <SetupPrompt
          variant="button"
          isCompleted={wizardCompleted}
          onShowWizard={onShowWizard}
        />
      }
    >
      <div className="space-y-3">
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
    </Section>
  );
}
