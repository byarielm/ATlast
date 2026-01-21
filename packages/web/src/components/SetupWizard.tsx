import { useState } from "react";
import { Heart, X, Check, ChevronRight } from "lucide-react";
import { PLATFORMS } from "../config/platforms";
import { ATPROTO_APPS } from "../config/atprotoApps";
import type { UserSettings, PlatformDestinations } from "../types/settings";
import ProgressBar from "./common/ProgressBar";
import Card from "./common/Card";
import PlatformBadge from "./common/PlatformBadge";
import Toggle from "./common/Toggle";
import DropdownWithIcons from "./common/DropdownWithIcons";
import type { DropdownOptionWithIcon } from "./common/DropdownWithIcons";

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (settings: Partial<UserSettings>) => void;
  currentSettings: UserSettings;
}

const wizardSteps = [
  { title: "Welcome", description: "Set up your preferences" },
  { title: "Platforms", description: "Choose where to import from" },
  { title: "Destinations", description: "Where should matches go?" },
  { title: "Privacy", description: "Data & automation settings" },
  { title: "Ready!", description: "All set to find your people" },
];

export default function SetupWizard({
  isOpen,
  onClose,
  onComplete,
  currentSettings,
}: SetupWizardProps) {
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set()
  );
  const [platformDestinations, setPlatformDestinations] =
    useState<PlatformDestinations>(currentSettings.platformDestinations);
  const [saveData, setSaveData] = useState(currentSettings.saveData);
  const [enableAutomation, setEnableAutomation] = useState(
    currentSettings.enableAutomation
  );
  const [automationFrequency, setAutomationFrequency] = useState(
    currentSettings.automationFrequency
  );

  if (!isOpen) return null;

  const handleComplete = () => {
    onComplete({
      platformDestinations,
      saveData,
      enableAutomation,
      automationFrequency,
      wizardCompleted: true,
    });
    onClose();
  };

  const togglePlatform = (platformKey: string) => {
    const newSelected = new Set(selectedPlatforms);
    if (newSelected.has(platformKey)) {
      newSelected.delete(platformKey);
    } else {
      newSelected.add(platformKey);
    }
    setSelectedPlatforms(newSelected);
  };

  // Get platforms to show on destinations page (only selected ones)
  const platformsToShow =
    selectedPlatforms.size > 0
      ? Object.entries(PLATFORMS).filter(([key]) => selectedPlatforms.has(key))
      : Object.entries(PLATFORMS);

  // Prepare app options with icons for dropdown
  const appOptions: DropdownOptionWithIcon[] = Object.values(ATPROTO_APPS).map(
    (app) => ({
      value: app.id,
      label: app.name,
      icon: app.icon,
    })
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card
        variant="wizard"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b-2 border-cyan-500/30 px-6 py-4 dark:border-purple-500/30">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-firefly-banner shadow-md dark:bg-firefly-banner-dark">
                <Heart className="size-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-purple-950 dark:text-cyan-50">
                Setup Assistant
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-purple-600 transition-colors hover:text-purple-950 dark:text-cyan-400 dark:hover:text-cyan-50"
            >
              <X className="size-6" />
            </button>
          </div>
          {/* Progress */}
          <ProgressBar
            current={wizardStep + 1}
            total={wizardSteps.length}
            variant="wizard"
          />
          <div className="mt-2 text-sm text-purple-750 dark:text-cyan-250">
            Step {wizardStep + 1} of {wizardSteps.length}:{" "}
            {wizardSteps[wizardStep].title}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {wizardStep === 0 && (
            <div className="space-y-3 text-center">
              <div className="mb-2 text-6xl">👋</div>
              <h3 className="text-2xl font-bold text-purple-950 dark:text-cyan-50">
                Welcome to ATlast!
              </h3>
              <p className="mx-auto max-w-md text-purple-750 dark:text-cyan-250">
                Let's get you set up in just a few steps. We'll help you
                configure how you want to reconnect with your community on the
                ATmosphere.
              </p>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
                Which platforms will you import from?
              </h3>
              <p className="text-sm text-purple-750 dark:text-cyan-250">
                Select one or more platforms you follow people on. We'll help
                you find them on the ATmosphere.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {Object.entries(PLATFORMS).map(([key, p]) => {
                  const isSelected = selectedPlatforms.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => togglePlatform(key)}
                      className={`relative rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? "border-2 border-purple-500 bg-purple-100/50 text-purple-950 dark:border-cyan-500 dark:bg-slate-950/50 dark:text-cyan-50"
                          : "border-cyan-500/30 hover:border-orange-500 hover:bg-purple-100/50 dark:border-purple-500/30 dark:hover:border-amber-400 dark:hover:bg-slate-950/50"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-orange-500 shadow-md dark:bg-amber-400">
                          <Check className="size-4 text-white dark:text-slate-900" />
                        </div>
                      )}
                      <PlatformBadge
                        platformKey={key}
                        showName={false}
                        size="lg"
                        className="mb-2 justify-center"
                      />
                      <div className="text-sm font-medium text-purple-950 dark:text-cyan-50">
                        {p.name}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedPlatforms.size > 0 && (
                <div className="mt-3 rounded-lg border border-orange-650/30 px-3 py-2 dark:border-amber-400/30">
                  <p className="text-sm text-purple-750 dark:text-cyan-250">
                    ✨ {selectedPlatforms.size} platform
                    {selectedPlatforms.size !== 1 ? "s" : ""} selected
                  </p>
                </div>
              )}
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
                Where should matches go?
              </h3>
              <p className="text-sm text-purple-750 dark:text-cyan-250">
                Choose which ATmosphere app to use for each platform. You can
                change this later.
              </p>
              <div className="mt-3 space-y-4">
                {platformsToShow.map(([key, p]) => {
                  return (
                    <div
                      key={key}
                      className="mx-sm flex max-w-lg items-center gap-3 px-3"
                    >
                      <PlatformBadge platformKey={key} size="sm" />
                      <DropdownWithIcons
                        value={
                          platformDestinations[
                            key as keyof PlatformDestinations
                          ]
                        }
                        onChange={(value) =>
                          setPlatformDestinations({
                            ...platformDestinations,
                            [key]: value,
                          })
                        }
                        options={appOptions}
                        className="ml-auto w-48"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {wizardStep === 3 && (
            <div className="space-y-3">
              <div>
                <h3 className="mb-1 text-xl font-bold text-purple-950 dark:text-cyan-50">
                  Privacy & Automation
                </h3>
                <p className="text-sm text-purple-750 dark:text-cyan-250">
                  Control how your data is used.
                </p>
              </div>

              <div className="space-y-4 px-4 py-3">
                <Toggle
                  checked={saveData}
                  onChange={setSaveData}
                  label="Save my data for future checks"
                  description="Store your following lists so we can check for new matches later. You can delete anytime."
                  id="save-data"
                />

                <div>
                  <Toggle
                    checked={enableAutomation}
                    onChange={setEnableAutomation}
                    label="Notify me about new matches"
                    description="We'll check periodically and DM you when people you follow join the ATmosphere."
                    id="enable-automation"
                  />
                  {enableAutomation && (
                    <select
                      value={automationFrequency}
                      onChange={(e) =>
                        setAutomationFrequency(
                          e.target.value as "Weekly" | "Monthly" | "Quarterly"
                        )
                      }
                      className="ml-auto mt-3 w-full max-w-xs rounded-lg border border-cyan-500/30 bg-white px-3 py-2 text-sm text-purple-950 transition-colors hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-purple-500/30 dark:bg-slate-800 dark:text-cyan-50 dark:hover:border-purple-400 dark:focus:ring-amber-400"
                    >
                      <option value="daily">Check daily</option>
                      <option value="weekly">Check weekly</option>
                      <option value="monthly">Check monthly</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-3 text-center">
              <div className="mb-2 text-6xl">🎉</div>
              <h3 className="text-2xl font-bold text-purple-950 dark:text-cyan-50">
                You're all set!
              </h3>
              <p className="mx-auto max-w-md text-purple-750 dark:text-cyan-250">
                Your preferences have been saved. You can change them anytime in
                Settings.
              </p>
              <div className="mt-3 px-4 py-3">
                <h4 className="mb-2 font-semibold text-purple-950 dark:text-cyan-50">
                  Quick Summary:
                </h4>
                <ul className="mx-auto max-w-sm space-y-1 text-left text-sm text-purple-750 dark:text-cyan-250">
                  <li className="flex items-center space-x-2">
                    <Check className="size-4 text-orange-500" />
                    <span>
                      Data Storage: {saveData ? "Enabled" : "Disabled"}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="size-4 text-orange-500" />
                    <span>
                      Automation: {enableAutomation ? "Enabled" : "Disabled"}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="size-4 text-orange-500" />
                    <span>
                      Platforms:{" "}
                      {selectedPlatforms.size > 0
                        ? selectedPlatforms.size
                        : "All"}{" "}
                      selected
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="size-4 text-orange-500" />
                    <span>Ready to upload your first file!</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t-2 border-cyan-500/30 px-6 py-4 dark:border-purple-500/30">
          <button
            onClick={() => wizardStep > 0 && setWizardStep(wizardStep - 1)}
            disabled={wizardStep === 0}
            className="px-4 py-2 text-purple-750 transition-colors hover:text-purple-950 disabled:cursor-not-allowed disabled:opacity-30 dark:text-cyan-250 dark:hover:text-cyan-50"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (wizardStep < wizardSteps.length - 1) {
                setWizardStep(wizardStep + 1);
              } else {
                handleComplete();
              }
            }}
            className="flex items-center space-x-2 rounded-lg bg-orange-600 px-6 py-2 font-medium text-white shadow-md transition-all hover:bg-orange-500 hover:shadow-lg"
          >
            <span>
              {wizardStep === wizardSteps.length - 1 ? "Get Started" : "Next"}
            </span>
            {wizardStep < wizardSteps.length - 1 && (
              <ChevronRight className="size-4" />
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
