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
      className="fixed inset-x-4 top-18 bottom-16 sm:bottom-auto md:absolute md:right-0 md:top-full md:left-auto md:w-[350px] md:mt-2 w-auto rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/80 shrink-0">
        <div>
          <p className="text-sm font-extrabold text-slate-900">
            Notifications
          </p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0 || isLoading}
          className="text-xs font-bold text-[#5B4CF3] hover:underline disabled:opacity-40 cursor-pointer"
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-[calc(100dvh-10rem)] sm:max-h-96 overflow-y-auto flex-1 divide-y divide-slate-100">
        {error && notifications.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-red-600 font-medium" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={refreshNotifications}
              className="mt-3 text-xs font-bold text-[#5B4CF3] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {error && notifications.length > 0 && (
          <div className="px-4 py-3 text-xs text-red-600 bg-red-50/50 border-b border-red-100 font-medium">
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
