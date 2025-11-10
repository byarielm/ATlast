import { useState } from 'react';
import { Heart, X, Check, ChevronRight } from 'lucide-react';
import { PLATFORMS } from '../constants/platforms';
import { ATPROTO_APPS } from '../constants/atprotoApps';
import type { UserSettings, PlatformDestinations } from '../types/settings';

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (settings: Partial<UserSettings>) => void;
  currentSettings: UserSettings;
}

const wizardSteps = [
  { title: 'Welcome', description: 'Set up your preferences' },
  { title: 'Platforms', description: 'Choose where to import from' },
  { title: 'Destinations', description: 'Where should matches go?' },
  { title: 'Privacy', description: 'Data & automation settings' },
  { title: 'Ready!', description: 'All set to find your people' },
];

export default function SetupWizard({ isOpen, onClose, onComplete, currentSettings }: SetupWizardProps) {
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [platformDestinations, setPlatformDestinations] = useState<PlatformDestinations>(
    currentSettings.platformDestinations
  );
  const [saveData, setSaveData] = useState(currentSettings.saveData);
  const [enableAutomation, setEnableAutomation] = useState(currentSettings.enableAutomation);
  const [automationFrequency, setAutomationFrequency] = useState(currentSettings.automationFrequency);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Setup Assistant</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>
          {/* Progress */}
          <div className="flex items-center space-x-2">
            {wizardSteps.map((step, idx) => (
              <div key={idx} className="flex-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    idx <= wizardStep ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Step {wizardStep + 1} of {wizardSteps.length}: {wizardSteps[wizardStep].title}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
          {wizardStep === 0 && (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">👋</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome to ATlast!</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Let's get you set up in just a few steps. We'll help you configure how you want to reconnect with your
                community on the ATmosphere.
              </p>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Which platforms will you import from?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select the platforms you follow people on. We'll help you find them on the ATmosphere.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {Object.entries(PLATFORMS).map(([key, p]) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedPlatform(key)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedPlatform === key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <Icon className="w-8 h-8 mx-auto mb-2 text-gray-700 dark:text-gray-300" />
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Where should matches go?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose which ATmosphere app to use for each platform. You can change this later.
              </p>
              <div className="space-y-3 mt-4">
                {Object.entries(PLATFORMS).map(([key, p]) => {
                  const Icon = p.icon;
                  return (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                      </div>
                      <select
                        value={platformDestinations[key as keyof PlatformDestinations]}
                        onChange={(e) =>
                          setPlatformDestinations({
                            ...platformDestinations,
                            [key]: e.target.value,
                          })
                        }
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100"
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
          )}

          {wizardStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Privacy & Automation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Control how your data is used.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={saveData}
                      onChange={(e) => setSaveData(e.target.checked)}
                      className="mt-1"
                      id="save-data"
                    />
                    <div className="flex-1">
                      <label htmlFor="save-data" className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                        Save my data for future checks
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Store your following lists so we can check for new matches later. You can delete anytime.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={enableAutomation}
                      onChange={(e) => setEnableAutomation(e.target.checked)}
                      className="mt-1"
                      id="enable-automation"
                    />
                    <div className="flex-1">
                      <label htmlFor="enable-automation" className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                        Notify me about new matches
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        We'll check periodically and DM you when people you follow join the ATmosphere.
                      </p>
                      {enableAutomation && (
                        <select
                          value={automationFrequency}
                          onChange={(e) => setAutomationFrequency(e.target.value as 'weekly' | 'monthly' | 'quarterly')}
                          className="mt-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-full text-gray-900 dark:text-gray-100"
                        >
                          <option value="daily">Check daily</option>
                          <option value="weekly">Check weekly</option>
                          <option value="monthly">Check monthly</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">You're all set!</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Your preferences have been saved. You can change them anytime in Settings.
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mt-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Quick Summary:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left max-w-sm mx-auto">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Data saving: {saveData ? 'Enabled' : 'Disabled'}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Automation: {enableAutomation ? 'Enabled' : 'Disabled'}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Ready to upload your first file!</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            onClick={() => wizardStep > 0 && setWizardStep(wizardStep - 1)}
            disabled={wizardStep === 0}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center space-x-2"
          >
            <span>{wizardStep === wizardSteps.length - 1 ? 'Get Started' : 'Next'}</span>
            {wizardStep < wizardSteps.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}