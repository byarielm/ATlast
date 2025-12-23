import { Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { PLATFORMS } from "../config/platforms";
import { ATPROTO_APPS } from "../config/atprotoApps";
import type { UserSettings, PlatformDestinations } from "../types/settings";
import Section from "../components/common/Section";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import PlatformBadge from "../components/common/PlatformBadge";

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
          className="w-full flex items-start space-x-4 p-4 text-left"
        >
          <div className="w-12 h-12 bg-firefly-banner dark:bg-firefly-banner-dark rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-1">
              <div className="font-semibold text-purple-950 dark:text-cyan-50 leading-tight">
                Run Setup Wizard
              </div>
            </div>
            <p className="text-sm text-purple-750 dark:text-cyan-250 leading-tight">
              Configure platform destinations, privacy, and automation settings
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-500 dark:text-cyan-400 flex-shrink-0 self-center" />
        </Card>

        {/* Current Configuration */}
        <div className="mt-2 py-2 px-3">
          <h3 className="font-semibold text-purple-950 dark:text-cyan-50 mb-3">
            Current Configuration
          </h3>
          <div className="gap-8 flex flex-wrap text-sm">
            <div>
              <div className="text-purple-750 dark:text-cyan-250 mb-1">
                Data Storage
              </div>
              <Badge variant="status">
                {userSettings.saveData ? "✅ Enabled" : "❌ Disabled"}
              </Badge>
            </div>
            <div>
              <div className="text-purple-750 dark:text-cyan-250 mb-1">
                Automation
              </div>
              <Badge variant="status">
                {userSettings.enableAutomation
                  ? `✅ ${userSettings.automationFrequency}`
                  : "❌ Disabled"}
              </Badge>
            </div>
            <div>
              <div className="text-purple-750 dark:text-cyan-250 mb-1">
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
        <Card className="mt-3 px-3 py-2 rounded-lg border-orange-650/50 dark:border-amber-400/50">
          <p className="text-sm text-purple-900 dark:text-cyan-100">
            💡 <strong>Tip:</strong> Choose different apps for different
            platforms based on content type. For example, send TikTok matches to
            Spark for video content.
          </p>
        </Card>

        <div className="py-2 space-y-0">
          {Object.entries(PLATFORMS).map(([key, p]) => {
            const currentDestination =
              userSettings.platformDestinations[
                key as keyof PlatformDestinations
              ];

            return (
              <div
                key={key}
                className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
              >
                <PlatformBadge
                  platformKey={key}
                  size="sm"
                  className="flex-1 min-w-0"
                />
                <select
                  value={currentDestination}
                  onChange={(e) => handleDestinationChange(key, e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-cyan-500/30 dark:border-purple-500/30 rounded-lg text-sm text-purple-950 dark:text-cyan-50 hover:border-cyan-400 dark:hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400 transition-colors"
                >
                  {Object.values(ATPROTO_APPS).map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
                </select>
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
        <div className="px-3 space-y-4">
          {/* Save Data Toggle */}
          <div className="">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-purple-950 dark:text-cyan-50 mb-1">
                  Save my data
                </div>
                <p className="text-sm text-purple-900 dark:text-cyan-100">
                  Store your following lists for periodic re-checking and new
                  match notifications
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={userSettings.saveData}
                  onChange={(e) =>
                    onSettingsUpdate({ saveData: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-650/50 dark:peer-focus:ring-amber-400/50 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-700 peer-checked:bg-orange-500 dark:peer-checked:bg-orange-400"></div>
              </label>
            </div>
          </div>

          {/* Automation Toggle */}
          <div className="">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="font-medium text-purple-950 dark:text-cyan-50 mb-1">
                  Notify about new matches
                </div>
                <p className="text-sm text-purple-900 dark:text-cyan-100">
                  Get DMs when people you follow join the ATmosphere
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={userSettings.enableAutomation}
                  onChange={(e) =>
                    onSettingsUpdate({ enableAutomation: e.target.checked })
                  }
                  className="sr-only peer"
                  disabled={!userSettings.saveData}
                />
                <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-650/50 dark:peer-focus:ring-amber-400/50 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-700 peer-checked:bg-orange-500 dark:peer-checked:bg-orange-400"></div>
              </label>
            </div>

            {userSettings.enableAutomation && (
              <div className="flex items-center gap-3 px-6">
                <label className="text-sm font-medium text-purple-950 dark:text-cyan-50 whitespace-nowrap">
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
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-cyan-500/30 dark:border-purple-500/30 rounded-lg text-sm text-purple-950 dark:text-cyan-50 hover:border-cyan-400 dark:hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400 transition-colors"
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
