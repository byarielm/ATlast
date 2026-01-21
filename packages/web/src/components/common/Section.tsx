import React from "react";

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  divider?: boolean;
  className?: string;
  action?: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  description,
  children,
  divider = false,
  className = "",
  action,
}) => {
  const containerClasses = divider
    ? "p-6 border-b-2 border-cyan-500/30 dark:border-purple-500/30"
    : "p-6";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div>
            <h2 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-purple-750 dark:text-cyan-250">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
};

export default Section;
