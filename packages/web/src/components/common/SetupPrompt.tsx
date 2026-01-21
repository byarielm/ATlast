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
        className={`mb-3 rounded-2xl bg-firefly-banner-dark p-6 text-white dark:bg-firefly-banner-dark ${className}`}
      >
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <h2 className="mb-2 text-2xl font-bold">
              Need help getting started?
            </h2>
            <p className="text-white">
              Run the setup assistant to configure your preferences in minutes.
            </p>
          </div>
          <button
            onClick={onShowWizard}
            className="flex items-center space-x-2 whitespace-nowrap rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 shadow-lg transition-all hover:bg-slate-100"
          >
            <span>Start Setup</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onShowWizard}
      className={`text-md flex items-center space-x-1 font-medium text-orange-650 transition-colors hover:text-orange-500 dark:text-amber-400 dark:hover:text-amber-300 ${className}`}
    >
      <Settings className="size-4" />
      <span>Configure</span>
    </button>
  );
};

export default SetupPrompt;
