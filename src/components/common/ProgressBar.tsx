import React from "react";

export type ProgressVariant = "search" | "wizard" | "default";

interface ProgressBarProps {
  current: number;
  total: number;
  variant?: ProgressVariant;
  className?: string;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  variant = "default",
  className = "",
  showLabel = false,
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const containerStyles: Record<ProgressVariant, string> = {
    default: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3",
    search: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3",
    wizard: "h-2 rounded-full",
  };

  const barStyles: Record<ProgressVariant, string> = {
    default:
      "bg-firefly-banner dark:bg-firefly-banner-dark h-full rounded-full transition-all",
    search:
      "bg-firefly-banner dark:bg-firefly-banner-dark h-full rounded-full transition-all",
    wizard: "bg-orange-500 h-full rounded-full transition-all",
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="text-sm text-purple-750 dark:text-cyan-250 mb-2">
          {percentage}% complete
        </div>
      )}
      <div
        className={containerStyles[variant]}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={barStyles[variant]}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
