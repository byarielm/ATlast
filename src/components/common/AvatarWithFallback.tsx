interface AvatarWithFallbackProps {
  avatar?: string;
  handle: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function AvatarWithFallback({
  avatar,
  handle,
  size = "md",
  className = "",
}: AvatarWithFallbackProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-xl",
  };

  const sizeClass = sizeClasses[size];

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${handle}'s avatar`}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-sm ${className}`}
    >
      <span className="text-white font-bold">
        {handle.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
