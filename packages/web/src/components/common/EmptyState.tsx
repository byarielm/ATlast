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
    <div className={`py-12 text-center ${className}`}>
      <Icon className="mx-auto mb-4 size-16 text-purple-900 dark:text-cyan-100" />
      <p className="font-medium text-purple-750 dark:text-cyan-250">{title}</p>
      {message && (
        <p className="mt-2 text-sm text-purple-950 dark:text-cyan-50">
          {message}
        </p>
      )}
    </div>
  );
};

export default EmptyState;
