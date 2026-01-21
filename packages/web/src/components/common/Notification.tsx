import React, { useEffect } from "react";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export type NotificationType = "success" | "error" | "info" | "warning";

interface NotificationProps {
  type: NotificationType;
  message: string;
  onClose: () => void;
  duration?: number;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styleMap = {
  success:
    "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-900 dark:text-green-100",
  error:
    "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-900 dark:text-red-100",
  warning:
    "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-900 dark:text-yellow-100",
  info: "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-900 dark:text-blue-100",
};

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
  duration = 5000,
}) => {
  const Icon = iconMap[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-2 p-4 shadow-lg ${styleMap[type]} animate-slide-in`}
      role="alert"
    >
      <Icon className="mt-0.5 size-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 transition-opacity hover:opacity-70"
        aria-label="Close notification"
      >
        <X className="size-5" />
      </button>
    </div>
  );
};

export default Notification;
