import React, { useEffect, useState } from "react";

interface AriaLiveAnnouncerProps {
  message: string;
  politeness?: "polite" | "assertive";
  clearAfter?: number;
}

/**
 * Invisible component that announces messages to screen readers
 * without displaying visual toasts
 */
const AriaLiveAnnouncer: React.FC<AriaLiveAnnouncerProps> = ({
  message,
  politeness = "polite",
  clearAfter = 5000,
}) => {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (message) {
      // Set the message to trigger screen reader announcement
      setAnnouncement(message);

      // Clear after specified time to allow new announcements
      if (clearAfter > 0) {
        const timer = setTimeout(() => setAnnouncement(""), clearAfter);
        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

export default AriaLiveAnnouncer;
