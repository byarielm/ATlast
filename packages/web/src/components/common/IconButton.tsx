import React from "react";
import { LucideIcon } from "lucide-react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  showLabel?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      label,
      showLabel = false,
      variant = "ghost",
      size = "md",
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-purple-100 dark:bg-slate-900 border-2 border-purple-500 dark:border-cyan-500 text-purple-950 dark:text-cyan-50 hover:border-orange-500 dark:hover:border-amber-400",
      secondary:
        "bg-slate-200/50 dark:bg-slate-900/50 border-2 border-cyan-500/30 dark:border-purple-500/30 text-purple-750 dark:text-cyan-250 hover:border-orange-500 dark:hover:border-amber-400",
      ghost:
        "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700",
    };

    const sizes = {
      sm: showLabel ? "px-3 py-1.5 rounded-lg" : "p-1.5 rounded-full",
      md: showLabel ? "px-4 py-2 rounded-xl" : "p-2 rounded-full",
      lg: showLabel ? "px-6 py-3 rounded-xl" : "p-3 rounded-full",
    };

    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    const textSizes = {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        aria-label={label}
        title={label}
        {...props}
      >
        <Icon className={iconSizes[size]} />
        {showLabel && (
          <span className={`ml-2 font-medium ${textSizes[size]}`}>{label}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export default IconButton;
