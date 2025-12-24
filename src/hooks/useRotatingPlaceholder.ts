import { useState, useEffect } from "react";

const PLATFORM_EXAMPLES = [
  "username.bsky.social",
  "username.blacksky.app",
  "username.tgnl.sh",
  "username.com",
];

const ROTATION_INTERVAL = 3000; // 3 seconds

export function useRotatingPlaceholder(): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PLATFORM_EXAMPLES.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return PLATFORM_EXAMPLES[index];
}
