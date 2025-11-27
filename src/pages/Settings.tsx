import {
  Settings as SettingsIcon,
  Sparkles,
  Shield,
  Trash2,
  Download,
  ChevronRight,
} from "lucide-react";
import { PLATFORMS } from "../constants/platforms";
import { ATPROTO_APPS } from "../constants/atprotoApps";
import type { UserSettings, PlatformDestinations } from "../types/settings";

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

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(userSettings, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "atlast-settings.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleResetSettings = () => {
    if (
      confirm(
        "Are you sure you want to reset all settings to defaults? This cannot be undone.",
      )
    ) {
      const { DEFAULT_SETTINGS } = require("../types/settings");
      onSettingsUpdate({
        ...DEFAULT_SETTINGS,
        wizardCompleted: true,
      });
    }
  };

  return (
    <div className="space-y-0">
      {/* Setup Assistant Section */}
      <div className="p-6 border-b-2 border-cyan-500/30 dark:border-purple-500/30">
        <div className="flex items-center space-x-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
              Setup Assistant
            </h2>
            <p className="text-sm text-purple-750 dark:text-cyan-250">
              Quick configuration wizard
            </p>
          </div>
        </div>

        <button
          onClick={onOpenWizard}
          className="w-full flex items-start space-x-4 p-4 bg-purple-100/20 dark:bg-slate-900/50 hover:bg-purple-100/40 dark:hover:bg-slate-900/70 rounded-xl transition-all text-left border-2 border-orange-650/50 dark:border-amber-400/50 hover:border-orange-500 dark:hover:border-amber-400 shadow-md hover:shadow-lg"
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
        </button>

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
              <div className="font-medium text-purple-950 dark:text-cyan-50">
                {userSettings.saveData ? "✅ Enabled" : "❌ Disabled"}
              </div>
            </div>
            <div>
              <div className="text-purple-750 dark:text-cyan-250 mb-1">
                Automation
              </div>
              <div className="font-medium text-purple-950 dark:text-cyan-50">
                {userSettings.enableAutomation
                  ? `✅ ${userSettings.automationFrequency}`
                  : "❌ Disabled"}
              </div>
            </div>
            <div>
              <div className="text-purple-750 dark:text-cyan-250 mb-1">
                Wizard
              </div>
              <div className="font-medium text-purple-950 dark:text-cyan-50">
                {userSettings.wizardCompleted ? "✅ Completed" : "⏳ Pending"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Destinations Section */}
      <div className="p-6 border-b-2 border-cyan-500/30 dark:border-purple-500/30">
        <div className="flex items-center space-x-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
              Match Destinations
            </h2>
            <p className="text-sm text-purple-750 dark:text-cyan-250">
              Where matches should go for each platform
            </p>
          </div>
        </div>

        <div className="mt-3 px-3 py-2 rounded-lg border border-orange-650/50 dark:border-amber-400/50">
          <p className="text-sm text-purple-900 dark:text-cyan-100">
            💡 <strong>Tip:</strong> Choose different apps for different
            platforms based on content type. For example, send TikTok matches to
            Spark for video content.
          </p>
        </div>

        <div className="py-2 space-y-0">
          {Object.entries(PLATFORMS).map(([key, p]) => {
            const Icon = p.icon;
            const currentDestination =
              userSettings.platformDestinations[
                key as keyof PlatformDestinations
              ];

            return (
              <div
                key={key}
                className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Icon className="w-6 h-6 text-purple-950 dark:text-cyan-50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-purple-950 dark:text-cyan-50">
                      {p.name}
                    </div>
                  </div>
                </div>
                <select
                  value={currentDestination}
                  onChange={(e) => handleDestinationChange(key, e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-cyan-500/30 dark:border-purple-500/30 rounded-lg text-sm text-purple-950 dark:text-cyan-50 hover:border-cyan-400 dark:hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400 transition-colors"
                >
                  {Object.values(ATPROTO_APPS).map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.icon} {app.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy & Data Section */}
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
              Privacy & Data
            </h2>
            <p className="text-sm text-purple-750 dark:text-cyan-250">
              Control how your data is stored
            </p>
          </div>
        </div>

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

          {/* Export Settings Button */}
          {/*<button
            onClick={handleExportSettings}
            className="w-full flex items-start space-x-4 p-4 bg-purple-100/20 dark:bg-slate-900/50 hover:bg-purple-100/40 dark:hover:bg-slate-900/70 rounded-xl transition-all text-left border-2 border-orange-650/30 dark:border-amber-400/30 hover:border-orange-500 dark:hover:border-orange-400 shadow-md hover:shadow-lg"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-purple-950 dark:text-cyan-50 leading-tight mb-1">
                Export Settings
              </div>
              <p className="text-sm text-purple-750 dark:text-cyan-250 leading-tight">
                Download your settings as a JSON file
              </p>
            </div>
          </button>*/}

          {/* Delete Data Button */}
          {/*<button
            onClick={handleResetSettings}
            className="w-full flex items-start space-x-4 p-4 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all text-left border-2 border-red-200/50 dark:border-red-800/50 hover:border-red-400 dark:hover:border-red-600 shadow-md hover:shadow-lg"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-red-700 dark:text-red-400 leading-tight mb-1">
                Reset All Settings
              </div>
              <p className="text-sm text-red-600 dark:text-red-300 leading-tight">
                Restore all settings to default values
              </p>
            </div>
          </button>*/}
        </div>
      </div>
    </div>
  );
}
