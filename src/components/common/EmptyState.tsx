import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  message,
  className = "",
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Icon className="w-16 h-16 text-purple-900 dark:text-cyan-100 mx-auto mb-4" />
      <p className="text-purple-750 dark:text-cyan-250 font-medium">{title}</p>
      {message && (
        <p className="text-sm text-purple-950 dark:text-cyan-50 mt-2">
          {message}
        </p>
      )}
    </div>
  );
};

export default EmptyState;
