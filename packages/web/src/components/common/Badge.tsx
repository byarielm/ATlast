import React from "react";

export type BadgeVariant = "stat" | "match" | "info" | "platform" | "status";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "info",
  className = "",
}) => {
  const baseStyles = "text-xs px-2 py-0.5 rounded-full font-medium";

  const variantStyles: Record<BadgeVariant, string> = {
    stat: "bg-purple-100 dark:bg-slate-900 text-purple-950 dark:text-cyan-50",
    match: "bg-purple-100 dark:bg-slate-900 text-purple-950 dark:text-cyan-50",
    info: "bg-purple-100 dark:bg-slate-900 text-purple-950 dark:text-cyan-50",
    platform:
      "bg-purple-100 dark:bg-cyan-900 text-purple-600 dark:text-cyan-400",
    status:
      "bg-purple-100 dark:bg-slate-900 text-orange-650 dark:text-amber-400",
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
