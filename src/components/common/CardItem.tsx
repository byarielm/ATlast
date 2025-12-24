import React from "react";

interface CardItemProps {
  avatar: React.ReactNode;
  content: React.ReactNode;
  action?: React.ReactNode;
  badges: React.ReactNode;
  description?: React.ReactNode;
  padding?: "p-3" | "p-4";
  badgeIndentClass: string; // Responsive indent class, e.g., "sm:pl-[44px]"
  onClick?: () => void;
}

/**
 * Shared card item component for consistent layout structure.
 *
 * Structure:
 * - Top row: Avatar + Content + Optional Action (flex layout)
 * - Badge row: With responsive left indent
 * - Optional description row: With responsive left indent
 *
 * Used by SearchResultCard and HistoryTab for consistent spacing.
 */
const CardItem: React.FC<CardItemProps> = ({
  avatar,
  content,
  action,
  badges,
  description,
  padding = "p-3",
  badgeIndentClass,
  onClick,
}) => {
  return (
    <div
      className={`${padding} cursor-pointer hover:scale-[1.01] transition-transform`}
      onClick={onClick}
    >
      {/* Top row: Avatar + Content + Action */}
      <div className="flex items-start gap-3 mb-1">
        {avatar}
        <div className="flex-1 min-w-0">{content}</div>
        {action}
      </div>

      {/* Badges row - responsive indent based on avatar size */}
      <div className={`flex items-center flex-wrap gap-2 pl-0 ${badgeIndentClass}`}>
        {badges}
      </div>

      {/* Optional description - same responsive indent as badges */}
      {description && (
        <div
          className={`text-sm text-purple-900 dark:text-cyan-100 line-clamp-2 mt-1 pt-2 pl-1 ${badgeIndentClass}`}
        >
          {description}
        </div>
      )}
    </div>
  );
};

export default CardItem;
