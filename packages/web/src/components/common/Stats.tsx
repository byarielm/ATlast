import React from "react";
import Badge from "./Badge";

interface StatItemProps {
  value: number | string;
  label: string;
  variant?: "default" | "highlight" | "muted";
  format?: boolean;
}

export const StatItem: React.FC<StatItemProps> = ({
  value,
  label,
  variant = "default",
  format = true,
}) => {
  const formattedValue =
    typeof value === "number" && format ? value.toLocaleString() : value;

  const textColors = {
    default: "text-slate-900 dark:text-slate-100",
    highlight: "text-orange-500 dark:text-amber-400",
    muted: "text-slate-600 dark:text-slate-400",
  };

  return (
    <div>
      <div
        className={`text-2xl font-bold ${textColors[variant]}`}
        aria-label={`${formattedValue} ${label}`}
      >
        {formattedValue}
      </div>
      <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
        {label}
      </div>
    </div>
  );
};

interface StatsGroupProps {
  stats: Array<{
    value: number | string;
    label: string;
    variant?: "default" | "highlight" | "muted";
  }>;
  className?: string;
}

export const StatsGroup: React.FC<StatsGroupProps> = ({
  stats,
  className = "",
}) => {
  return (
    <div className={`grid gap-4 text-center ${className}`}>
      {stats.map((stat, index) => (
        <StatItem key={index} {...stat} />
      ))}
    </div>
  );
};

interface StatBadgeProps {
  value: number | string;
  label: string;
  format?: boolean;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  value,
  label,
  format = true,
}) => {
  const formattedValue =
    typeof value === "number" && format ? value.toLocaleString() : value;

  return (
    <Badge variant="stat">
      {formattedValue} {label}
    </Badge>
  );
};
