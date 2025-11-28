import { useState } from "react";
import { Globe, Settings as SettingsIcon } from "lucide-react";

interface FaviconIconProps {
  url: string;
  alt: string;
  className?: string;
}

export default function FaviconIcon({ url, alt, className }: FaviconIconProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <Globe
        className={
          className || "w-4 h-4 text-neutral-400 dark:text-neutral-500"
        }
      />
    );
  }

  return (
    <>
      {/* Fallback/Placeholder */}
      {!loaded && (
        <Globe
          className={
            className || "w-4 h-4 text-neutral-400 dark:text-neutral-500"
          }
        />
      )}

      {/* The actual image */}
      <img
        src={url}
        alt={`${alt} favicon`}
        className={className || "h-4 w-4"}
        // Use inline style to show only when loaded, preventing a broken image icon flicker
        style={{ display: loaded ? "block" : "none" }}
        onLoad={() => {
          setLoaded(true);
          setError(false);
        }}
        onError={() => {
          setError(true);
        }}
      />
    </>
  );
}
