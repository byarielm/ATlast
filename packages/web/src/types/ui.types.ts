import type { LucideIcon } from "lucide-react";

export interface BaseComponentProps {
  className?: string;
}

export interface AvatarProps extends BaseComponentProps {
  avatar?: string;
  handle: string;
  size?: "sm" | "md" | "lg";
}

export interface ButtonVariant {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  disabled?: boolean;
}

export interface IconButtonProps extends ButtonVariant, BaseComponentProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

export interface TabConfig {
  id: string;
  icon: LucideIcon;
  label: string;
}
