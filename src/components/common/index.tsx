// Re-export all common components for easier imports
export { default as Avatar } from "./AvatarWithFallback";
export { default as Badge } from "./Badge";
export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as Dropdown } from "./Dropdown";
export { default as DropdownWithIcons } from "./DropdownWithIcons";
export { default as EmptyState } from "./EmptyState";
export { default as ErrorBoundary } from "./ErrorBoundary";
export { default as FollowButton } from "./FollowButton";
export { default as IconButton } from "./IconButton";
export { default as Notification } from "./Notification";
export { default as NotificationContainer } from "./NotificationContainer";
export { default as PlatformBadge } from "./PlatformBadge";
export { default as ProgressBar } from "./ProgressBar";
export { default as Section } from "./Section";
export { default as SetupPrompt } from "./SetupPrompt";
export { default as Skeleton } from "./Skeleton";
export { default as Toggle } from "./Toggle";

// Export Stats components
export { StatItem, StatBadge, StatsGroup } from "./Stats";

// Export Skeletons
export {
  SearchResultSkeleton,
  UploadHistorySkeleton,
  ProfileSkeleton,
} from "./LoadingSkeleton";

// Export types
export type { BadgeVariant } from "./Badge";
export type { CardVariant } from "./Card";
export type { SetupPromptVariant } from "./SetupPrompt";
export type { ProgressVariant } from "./ProgressBar";
export type { NotificationType } from "./Notification";
export type { DropdownOption } from "./Dropdown";
export type { DropdownOptionWithIcon } from "./DropdownWithIcons";
