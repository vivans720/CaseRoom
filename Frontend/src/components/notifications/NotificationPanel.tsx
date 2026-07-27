import { type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import { NotificationItem } from "./NotificationItem";
import type { Notification } from "../../types";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const resolveId = (value: Notification["caseId"]): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id;
};

export const NotificationPanel = ({
  isOpen,
  onClose,
}: NotificationPanelProps): JSX.Element | null => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markNotificationRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  if (!isOpen) return null;

  const handleOpenNotification = (notification: Notification) => {
    void (async () => {
      if (notification.isRead !== true) {
        await markNotificationRead(notification._id);
      }

      const caseId = resolveId(notification.caseId);
      if (caseId) {
        navigate(`/case/${caseId}`);
        onClose();
      }
    })();
  };

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="fixed inset-x-4 top-16 md:absolute md:right-0 md:left-auto md:w-[320px] md:mt-2 w-auto rounded-xl border border-border bg-surface shadow-lg z-30 animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            Notifications
          </p>
          <p className="text-xs text-text-tertiary">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0 || isLoading}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-90 overflow-y-auto">
        {error && notifications.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={refreshNotifications}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {error && notifications.length > 0 && (
          <div className="px-4 py-3 text-xs text-danger border-b border-border-light">
            {error}
          </div>
        )}

        {isLoading && notifications.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && !error && (
          <EmptyState
            title="No notifications"
            description="You will see updates here when they arrive."
          />
        )}

        {notifications.length > 0 && (
          <ul role="list" aria-label="Notification list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onOpen={handleOpenNotification}
                onMarkRead={markNotificationRead}
                onDelete={deleteNotification}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
