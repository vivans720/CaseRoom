import type { JSX, KeyboardEvent, MouseEvent } from "react";
import type { Notification, NotificationType } from "../../types";

interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  onMarkRead: (notificationId: string) => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const TYPE_LABELS: Record<NotificationType, string> = {
  new_message: "Message",
  mentioned_in_message: "Mention",
  added_to_case: "Added",
  removed_from_case: "Removed",
  case_archived: "Archived",
  case_unarchived: "Unarchived",
  case_status_updated: "Status",
  case_deleted: "Deleted",
  role_updated: "Role",
  task_assigned: "Task",
  task_completed: "Task Done",
  task_status_updated: "Task Status",
};

const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();

  if (diffMs < MINUTE_MS) return "Just now";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  return `${Math.floor(diffMs / DAY_MS)}d ago`;
};

export const NotificationItem = ({
  notification,
  onOpen,
  onMarkRead,
  onDelete,
}: NotificationItemProps): JSX.Element => {
  const isUnread = notification.isRead !== true;
  const typeLabel = TYPE_LABELS[notification.type];

  const handleOpen = () => {
    onOpen(notification);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  };

  const handleMarkRead = async (event: MouseEvent) => {
    event.stopPropagation();
    await onMarkRead(notification._id);
  };

  const handleDelete = async (event: MouseEvent) => {
    event.stopPropagation();
    await onDelete(notification._id);
  };

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      className={`px-4 py-3 border-b border-border-light cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        isUnread ? "bg-primary-light/40" : "bg-surface"
      } hover:bg-surface-hover`}
      aria-label={`${typeLabel} notification`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              {typeLabel}
            </span>
            {isUnread && (
              <span
                className="h-2 w-2 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-text-primary truncate">
            {notification.title}
          </p>
          <p className="text-xs text-text-secondary">{notification.body}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-[11px] text-text-tertiary">
            {formatRelativeTime(notification.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            {isUnread && (
              <button
                type="button"
                onClick={handleMarkRead}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Mark read
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="text-[11px] font-medium text-danger hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};
