import React from "react";
import { getPlatform } from "../../lib/utils/platform";

interface PlatformBadgeProps {
  platformKey: string;
  showIcon?: boolean;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  platformKey,
  showIcon = true,
  showName = true,
  size = "md",
  className = "",
}) => {
  const platform = getPlatform(platformKey);
  const Icon = platform.icon;

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showIcon && (
        <Icon
          className={`${iconSizes[size]} text-purple-950 dark:text-cyan-50`}
        />
      )}
      {showName && (
        <span
          className={`font-medium text-purple-950 dark:text-cyan-50 capitalize ${textSizes[size]}`}
        >
          {platform.name}
        </span>
      )}
    </div>
  );
};

export default PlatformBadge;
