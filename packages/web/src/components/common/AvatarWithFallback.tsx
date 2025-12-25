import React, { useState } from "react";

interface AvatarWithFallbackProps {
  avatar?: string;
  handle: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { container: "w-8 h-8", text: "text-sm" },
  md: { container: "w-12 h-12", text: "text-base" },
  lg: { container: "w-16 h-16", text: "text-xl" },
};

const AvatarWithFallback = React.memo<AvatarWithFallbackProps>(
  ({ avatar, handle, size = "md", className = "" }) => {
    const [imageError, setImageError] = useState(false);
    const { container, text } = sizeClasses[size];

    const fallbackInitial = handle.charAt(0).toUpperCase();

    if (!avatar || imageError) {
      return (
        <div
          className={`${container} bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-sm ${className}`}
          aria-label={`${handle}'s avatar`}
        >
          <span className={`text-white font-bold ${text}`}>
            {fallbackInitial}
          </span>
        </div>
      );
    }

    return (
      <img
        src={avatar}
        alt={`${handle}'s avatar`}
        className={`${container} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    );
  },
);

AvatarWithFallback.displayName = "AvatarWithFallback";

export default AvatarWithFallback;
