import React from "react";
import { Settings, ChevronRight } from "lucide-react";

export type SetupPromptVariant = "banner" | "button";

interface SetupPromptProps {
  variant?: SetupPromptVariant;
  isCompleted: boolean;
  onShowWizard: () => void;
  className?: string;
}

const SetupPrompt: React.FC<SetupPromptProps> = ({
  variant = "button",
  isCompleted,
  onShowWizard,
  className = "",
}) => {
  if (isCompleted) return null;

  if (variant === "banner") {
    return (
      <div
        className={`bg-firefly-banner-dark dark:bg-firefly-banner-dark rounded-2xl p-6 text-white mb-3 ${className}`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">
              Need help getting started?
            </h2>
            <p className="text-white">
              Run the setup assistant to configure your preferences in minutes.
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
    );
  }

  return (
    <button
      onClick={onShowWizard}
      className={`text-md text-orange-650 hover:text-orange-500 dark:text-amber-400 dark:hover:text-amber-300 font-medium transition-colors flex items-center space-x-1 ${className}`}
    >
      <Settings className="w-4 h-4" />
      <span>Configure</span>
    </button>
  );
};

export default SetupPrompt;
