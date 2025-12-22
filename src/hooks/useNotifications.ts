import { useState, useCallback } from "react";
import type { NotificationType } from "../components/common/Notification";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback(
    (type: NotificationType, message: string) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      setNotifications((prev) => [...prev, { id, type, message }]);
      return id;
    },
    [],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string) => addNotification("success", message),
    [addNotification],
  );

  const error = useCallback(
    (message: string) => addNotification("error", message),
    [addNotification],
  );

  const info = useCallback(
    (message: string) => addNotification("info", message),
    [addNotification],
  );

  const warning = useCallback(
    (message: string) => addNotification("warning", message),
    [addNotification],
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    info,
    warning,
  };
}
