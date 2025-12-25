import React from "react";
import { createPortal } from "react-dom";
import Notification, { NotificationType } from "./Notification";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContainerProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove,
}) => {
  if (notifications.length === 0) return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>,
    document.body,
  );
};

export default NotificationContainer;
