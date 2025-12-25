import React from "react";

export type CardVariant =
  | "default"
  | "result"
  | "upload"
  | "wizard"
  | "interactive";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  className = "",
  onClick,
}) => {
  const baseStyles =
    "rounded-2xl border-2 border-cyan-500/30 dark:border-purple-500/30";

  const variantStyles: Record<CardVariant, string> = {
    default: "bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl",
    result: "bg-white/50 dark:bg-slate-900/50 shadow-sm overflow-hidden",
    upload:
      "bg-purple-100/20 dark:bg-slate-900/50 hover:bg-purple-100/40 dark:hover:bg-slate-900/70 border-orange-650/50 dark:border-amber-400/50 hover:border-orange-500 dark:hover:border-amber-400 shadow-md hover:shadow-lg transition-all",
    wizard: "bg-white dark:bg-slate-900 shadow-2xl",
    interactive: "hover:scale-105 transition-all shadow-lg cursor-pointer",
  };

  const clickableStyles = onClick
    ? "cursor-pointer hover:scale-[1.01] transition-transform"
    : "";

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${clickableStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
