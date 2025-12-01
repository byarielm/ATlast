import { useState } from "react";
import { Globe } from "lucide-react";

interface FaviconIconProps {
  url: string;
  alt: string;
  className?: string;
  useButtonStyling?: boolean;
}

export default function FaviconIcon({
  url,
  alt,
  className,
  useButtonStyling = false,
}: FaviconIconProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Define the base classes (applied to the image itself)
  const imageClasses = "w-full h-full object-contain";

  // Define the special button classes conditionally
  const boundaryClasses = useButtonStyling
    ? "bg-white p-1 rounded-full shadow-md flex items-center justify-center"
    : ""; // No special styling by default

  // Combine the passed-in class name (for size) with the conditional boundary classes
  const finalWrapperClasses = `${className || "w-4 h-4"} ${boundaryClasses}`;

  if (error) {
    return (
      <div className={`${finalWrapperClasses}`}>
        <Globe className={`${imageClasses} text-neutral-500`} />
      </div>
    );
  }

  return (
    // Use the final combined classes on the wrapper
    <div className={finalWrapperClasses}>
      {/* Placeholder while loading */}
      {!loaded && (
        <Globe
          className={`${imageClasses} text-neutral-400 dark:text-neutral-500`}
        />
      )}

      {/* The actual image */}
      <img
        src={url}
        alt={`${alt} favicon`}
        className={imageClasses}
        style={{ display: loaded ? "block" : "none" }}
        onLoad={() => {
          setLoaded(true);
          setError(false);
        }}
        onError={() => {
          setError(true);
        }}
      />
    </div>
  );
}
