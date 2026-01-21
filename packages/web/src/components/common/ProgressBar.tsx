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

  // Wizard variant uses segmented progress (one segment per step)
  if (variant === "wizard") {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {Array.from({ length: total }, (_, idx) => (
          <div key={idx} className="flex-1">
            <div
              className={`h-2 rounded-full transition-all ${
                idx < current
                  ? "bg-orange-500"
                  : "bg-cyan-500/30 dark:bg-purple-500/30"
              }`}
            />
          </div>
        ))}
      </div>
    );
  }

  // Default and search variants use percentage-based progress bar
  const containerStyles: Record<ProgressVariant, string> = {
    default: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3",
    search: "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3",
    wizard: "", // Not used in this path
  };

  const barStyles: Record<ProgressVariant, string> = {
    default:
      "bg-firefly-banner dark:bg-firefly-banner-dark h-full rounded-full transition-all",
    search:
      "bg-firefly-banner dark:bg-firefly-banner-dark h-full rounded-full transition-all",
    wizard: "", // Not used in this path
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-2 text-sm text-purple-750 dark:text-cyan-250">
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
