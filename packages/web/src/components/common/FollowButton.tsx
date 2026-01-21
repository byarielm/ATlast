import React from "react";
import { Check, UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  isFollowed: boolean;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  appName?: string;
}

const FollowButton = React.memo<FollowButtonProps>(
  ({ isFollowed, isSelected, onToggle, disabled = false, appName }) => {
    const getButtonStyles = () => {
      if (isFollowed) {
        return "bg-purple-100 dark:bg-slate-900 border-2 border-purple-500 dark:border-cyan-500 text-purple-950 dark:text-cyan-50 shadow-md cursor-not-allowed opacity-50";
      }
      if (isSelected) {
        return "bg-purple-100 dark:bg-slate-900 border-2 border-purple-500 dark:border-cyan-500 text-purple-950 dark:text-cyan-50 shadow-md hover:scale-105";
      }
      return "bg-slate-200/50 dark:bg-slate-900/50 border-2 border-cyan-500/30 dark:border-purple-500/30 text-purple-750 dark:text-cyan-250 hover:border-orange-500 dark:hover:border-amber-400 hover:scale-105";
    };

    const getTitle = () => {
      if (isFollowed) {
        return appName
          ? `Already following on ${appName}`
          : "Already following";
      }
      return isSelected ? "Selected to follow" : "Select to follow";
    };

    const Icon = isFollowed ? Check : isSelected ? UserCheck : UserPlus;

    return (
      <button
        onClick={onToggle}
        disabled={disabled || isFollowed}
        className={`flex-shrink-0 self-start rounded-full p-2 font-medium transition-all ${getButtonStyles()}`}
        title={getTitle()}
        aria-label={getTitle()}
      >
        <Icon className="size-4" />
      </button>
    );
  }
);

FollowButton.displayName = "FollowButton";

export default FollowButton;
