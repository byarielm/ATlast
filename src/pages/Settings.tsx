import { Settings as SettingsIcon, Sparkles, Shield, Bell, Trash2, Download, ChevronRight } from "lucide-react";
import { PLATFORMS } from "../constants/platforms";
import { ATPROTO_APPS } from "../constants/atprotoApps";
import type { UserSettings, PlatformDestinations } from "../types/settings";

interface SettingsPageProps {
  userSettings: UserSettings;
  onSettingsUpdate: (settings: Partial<UserSettings>) => void;
  onOpenWizard: () => void;
}

export default function SettingsPage({ userSettings, onSettingsUpdate, onOpenWizard }: SettingsPageProps) {
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
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'atlast-settings.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      // Import DEFAULT_SETTINGS
      const { DEFAULT_SETTINGS } = require('../types/settings');
      onSettingsUpdate({
        ...DEFAULT_SETTINGS,
        wizardCompleted: true, // Keep wizard completed
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Setup Wizard Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-firefly-amber via-firefly-orange to-firefly-pink rounded-xl flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Setup Assistant</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Quick configuration wizard</p>
          </div>
        </div>
        
        <button
          onClick={onOpenWizard}
          className="w-full p-4 bg-gradient-to-r from-firefly-amber/10 via-firefly-orange/10 to-firefly-pink/10 border-2 border-firefly-orange/30 rounded-xl hover:border-firefly-orange hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Run Setup Wizard</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure platform destinations, privacy, and automation settings
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-firefly-orange flex-shrink-0" />
          </div>
        </button>
      </div>

      {/* Platform Destinations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-firefly-cyan to-firefly-pink rounded-xl flex items-center justify-center shadow-md">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Match Destinations</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Where matches should go for each platform</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {Object.entries(PLATFORMS).map(([key, p]) => {
            const Icon = p.icon;
            const currentDestination = userSettings.platformDestinations[key as keyof PlatformDestinations];
            const destinationApp = ATPROTO_APPS[currentDestination];
            
            return (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Currently: {destinationApp?.icon} {destinationApp?.name}
                    </div>
                  </div>
                </div>
                <select
                  value={currentDestination}
                  onChange={(e) => handleDestinationChange(key, e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:border-firefly-orange focus:outline-none focus:ring-2 focus:ring-firefly-orange transition-colors"
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
        
        <div className="mt-4 p-3 bg-firefly-amber/10 dark:bg-firefly-amber/20 rounded-lg border border-firefly-amber/30">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            💡 <strong>Tip:</strong> Choose different apps for different platforms based on content type. 
            For example, send TikTok matches to Spark for video content.
          </p>
        </div>
      </div>

      {/* Privacy & Data */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-firefly-cyan to-firefly-orange rounded-xl flex items-center justify-center shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Privacy & Data</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Control how your data is stored</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="p-4 bg-firefly-cyan/10 dark:bg-firefly-cyan/20 rounded-xl border border-firefly-cyan/30">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">Save my data</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Store your following lists for periodic re-checking and new match notifications
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input 
                  type="checkbox" 
                  checked={userSettings.saveData}
                  onChange={(e) => onSettingsUpdate({ saveData: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-firefly-orange/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-firefly-orange"></div>
              </label>
            </div>
          </div>

          {!userSettings.saveData && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Note:</strong> Disabling data storage will prevent periodic checks and automation features.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Automation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-firefly-pink to-firefly-orange rounded-xl flex items-center justify-center shadow-md">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Automation</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Automated checks and notifications</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="p-4 bg-firefly-pink/10 dark:bg-firefly-pink/20 rounded-xl border border-firefly-pink/30">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">Notify about new matches</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get DMs when people you follow join the ATmosphere
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input 
                  type="checkbox" 
                  checked={userSettings.enableAutomation}
                  onChange={(e) => onSettingsUpdate({ enableAutomation: e.target.checked })}
                  className="sr-only peer"
                  disabled={!userSettings.saveData}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-firefly-pink/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-firefly-pink peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
            
            {userSettings.enableAutomation && (
              <div className="mt-4 pt-4 border-t border-firefly-pink/20">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Check frequency
                </label>
                <select
                  value={userSettings.automationFrequency}
                  onChange={(e) => onSettingsUpdate({ automationFrequency: e.target.value as 'weekly' | 'monthly' | 'quarterly' })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:border-firefly-pink focus:outline-none focus:ring-2 focus:ring-firefly-pink"
                >
                  <option value="daily">Weekly - Check every week for new matches</option>
                  <option value="weekly">Monthly - Check once per month</option>
                  <option value="monthly">Quarterly - Check once per quarter</option>
                </select>
              </div>
            )}
          </div>

          {!userSettings.saveData && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 Enable "Save my data" to use automation features
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center shadow-md">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Data Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Export or reset your settings</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleExportSettings}
            className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-firefly-cyan hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Export Settings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download your settings as a JSON file
                </p>
              </div>
              <Download className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </button>

          <button
            onClick={handleResetSettings}
            className="w-full p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 hover:border-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">Reset All Settings</h3>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Restore all settings to default values
                </p>
              </div>
              <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0" />
            </div>
          </button>
        </div>
      </div>

      {/* Current Configuration Summary */}
      <div className="bg-gradient-to-r from-firefly-cyan/10 via-firefly-orange/10 to-firefly-pink/10 dark:from-firefly-cyan/5 dark:via-firefly-orange/5 dark:to-firefly-pink/5 rounded-2xl p-6 border-2 border-firefly-orange/30">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Configuration</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Data Storage</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {userSettings.saveData ? '✅ Enabled' : '❌ Disabled'}
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Automation</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {userSettings.enableAutomation ? `✅ ${userSettings.automationFrequency}` : '❌ Disabled'}
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Wizard</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {userSettings.wizardCompleted ? '✅ Completed' : '⏳ Pending'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}