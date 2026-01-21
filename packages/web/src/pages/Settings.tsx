import { Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { PLATFORMS } from "../config/platforms";
import { ATPROTO_APPS } from "../config/atprotoApps";
import type { UserSettings, PlatformDestinations } from "../types/settings";
import Section from "../components/common/Section";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import PlatformBadge from "../components/common/PlatformBadge";
import Toggle from "../components/common/Toggle";
import DropdownWithIcons from "../components/common/DropdownWithIcons";
import type { DropdownOptionWithIcon } from "../components/common/DropdownWithIcons";

interface SettingsPageProps {
  userSettings: UserSettings;
  onSettingsUpdate: (settings: Partial<UserSettings>) => void;
  onOpenWizard: () => void;
}

export default function SettingsPage({
  userSettings,
  onSettingsUpdate,
  onOpenWizard,
}: SettingsPageProps) {
  const handleDestinationChange = (platform: string, destination: string) => {
    onSettingsUpdate({
      platformDestinations: {
        ...userSettings.platformDestinations,
        [platform]: destination,
      },
    });
  };

  // Prepare app options with icons for dropdown
  const appOptions: DropdownOptionWithIcon[] = Object.values(ATPROTO_APPS).map(
    (app) => ({
      value: app.id,
      label: app.name,
      icon: app.icon,
    })
  );

  return (
    <div className="space-y-0">
      {/* Setup Assistant Section */}
      <Section
        title="Setup Assistant"
        description="Quick configuration wizard"
        divider
      >
        <Card
          variant="upload"
          onClick={onOpenWizard}
          className="flex w-full items-start space-x-4 p-4 text-left"
        >
          <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-firefly-banner shadow-md dark:bg-firefly-banner-dark">
            <SettingsIcon className="size-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="font-semibold leading-tight text-purple-950 dark:text-cyan-50">
                Run Setup Wizard
              </div>
            </div>
            <p className="text-sm leading-tight text-purple-750 dark:text-cyan-250">
              Configure platform destinations, privacy, and automation settings
            </p>
          </div>
          <ChevronRight className="size-5 flex-shrink-0 self-center text-purple-500 dark:text-cyan-400" />
        </Card>

        {/* Current Configuration */}
        <div className="mt-2 px-3 py-2">
          <h3 className="mb-3 font-semibold text-purple-950 dark:text-cyan-50">
            Current Configuration
          </h3>
          <div className="flex flex-wrap gap-8 text-sm">
            <div>
              <div className="mb-1 text-purple-750 dark:text-cyan-250">
                Data Storage
              </div>
              <Badge variant="status">
                {userSettings.saveData ? "✅ Enabled" : "❌ Disabled"}
              </Badge>
            </div>
            <div>
              <div className="mb-1 text-purple-750 dark:text-cyan-250">
                Automation
              </div>
              <Badge variant="status">
                {userSettings.enableAutomation
                  ? `✅ ${userSettings.automationFrequency}`
                  : "❌ Disabled"}
              </Badge>
            </div>
            <div>
              <div className="mb-1 text-purple-750 dark:text-cyan-250">
                Wizard
              </div>
              <Badge variant="status">
                {userSettings.wizardCompleted ? "✅ Completed" : "⏳ Pending"}
              </Badge>
            </div>
          </div>
        </div>
      </Section>

      {/* Match Destinations Section */}
      <Section
        title="Match Destinations"
        description="Where matches should go for each platform"
        divider
      >
        <Card className="mt-3 rounded-lg border-orange-650/50 px-3 py-2 dark:border-amber-400/50">
          <p className="text-sm text-purple-900 dark:text-cyan-100">
            💡 <strong>Tip:</strong> Choose different apps for different
            platforms based on content type. For example, send TikTok matches to
            Spark for video content.
          </p>
        </Card>

        <div className="space-y-0 py-2">
          {Object.entries(PLATFORMS).map(([key, p]) => {
            const currentDestination =
              userSettings.platformDestinations[
                key as keyof PlatformDestinations
              ];

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors"
              >
                <PlatformBadge
                  platformKey={key}
                  size="sm"
                  className="min-w-0 flex-1"
                />
                <DropdownWithIcons
                  value={currentDestination}
                  onChange={(value) => handleDestinationChange(key, value)}
                  options={appOptions}
                  className="w-48"
                />
              </div>
            );
          })}
        </div>
      </Section>

      {/* Privacy & Data Section */}
      <Section
        title="Privacy & Data"
        description="Control how your data is stored"
      >
        <div className="space-y-4 px-3">
          {/* Save Data Toggle */}
          <Toggle
            checked={userSettings.saveData}
            onChange={(checked) => onSettingsUpdate({ saveData: checked })}
            label="Save my data"
            description="Store your following lists for periodic re-checking and new match notifications"
            id="settings-save-data"
          />

          {/* Automation Toggle */}
          <div>
            <Toggle
              checked={userSettings.enableAutomation}
              onChange={(checked) =>
                onSettingsUpdate({ enableAutomation: checked })
              }
              label="Notify about new matches"
              description="Get DMs when people you follow join the ATmosphere"
              disabled={!userSettings.saveData}
              id="settings-automation"
            />

            {userSettings.enableAutomation && (
              <div className="mt-4 flex items-center gap-3 px-0">
                <label className="whitespace-nowrap text-sm font-medium text-purple-950 dark:text-cyan-50">
                  Frequency
                </label>
                <select
                  value={userSettings.automationFrequency}
                  onChange={(e) =>
                    onSettingsUpdate({
                      automationFrequency: e.target.value as
                        | "Weekly"
                        | "Monthly"
                        | "Quarterly",
                    })
                  }
                  className="flex-1 rounded-lg border border-cyan-500/30 bg-white px-3 py-2 text-sm text-purple-950 transition-colors hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-purple-500/30 dark:bg-slate-800 dark:text-cyan-50 dark:hover:border-purple-400 dark:focus:ring-amber-400"
                >
                  <option value="daily">Check daily</option>
                  <option value="weekly">Check weekly</option>
                  <option value="monthly">Check monthly</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
