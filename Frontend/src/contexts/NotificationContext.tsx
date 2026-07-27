import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import type { Notification } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import * as notificationService from "../services/notificationService";

interface MessageReadPayload {
  caseId: string;
}

const MAX_TOASTS = 3;

export interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  toasts: Notification[];
  isLoading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  dismissToast: (notificationId: string) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps): JSX.Element => {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    setToasts([]);
    setIsLoading(false);
    setError(null);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const [list, count] = await Promise.all([
        notificationService.getNotifications(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      setError("Failed to load notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      resetState();
      return;
    }

    void refreshNotifications();
  }, [isAuthenticated, refreshNotifications, resetState]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === notification._id);
        if (!exists && notification.isRead !== true) {
          setUnreadCount((count) => count + 1);
        }
        return exists ? prev : [notification, ...prev];
      });

      setToasts((prev) => {
        const exists = prev.some((item) => item._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev].slice(0, MAX_TOASTS);
      });
    };

    const handleMessageRead = (payload: MessageReadPayload) => {
      if (!payload.caseId) return;

      setNotifications((prev) => {
        let clearedCount = 0;
        const next = prev.map((n) => {
          if (
            !n.isRead &&
            (n.type === "new_message" || n.type === "mentioned_in_message") &&
            (typeof n.caseId === "string"
              ? n.caseId === payload.caseId
              : n.caseId?._id === payload.caseId)
          ) {
            clearedCount++;
            return { ...n, isRead: true, readAt: new Date().toISOString() };
          }
          return n;
        });

        if (clearedCount > 0) {
          setUnreadCount((count) => Math.max(0, count - clearedCount));
        }

        return next;
      });

      // Clear related toasts
      setToasts((prev) =>
        prev.filter((t) => {
          const cid = typeof t.caseId === "string" ? t.caseId : t.caseId?._id;
          return !(
            (t.type === "new_message" || t.type === "mentioned_in_message") &&
            cid === payload.caseId
          );
        }),
      );
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("message_read", handleMessageRead);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("message_read", handleMessageRead);
    };
  }, [socket, isAuthenticated]);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      const existing = notifications.find((n) => n._id === notificationId);
      const wasUnread = existing ? existing.isRead !== true : false;

      setError(null);
      try {
        const updated =
          await notificationService.markNotificationRead(notificationId);

        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId
              ? {
                  ...n,
                  isRead: true,
                  readAt: updated.readAt ?? n.readAt,
                }
              : n,
          ),
        );

        if (wasUnread) {
          setUnreadCount((prev) => Math.max(prev - 1, 0));
        }
      } catch {
        setError("Failed to update notification. Please try again.");
      }
    },
    [notifications],
  );

  const markAllRead = useCallback(async () => {
    setError(null);
    try {
      await notificationService.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) =>
          n.isRead
            ? n
            : {
                ...n,
                isRead: true,
                readAt: new Date().toISOString(),
              },
        ),
      );
      setUnreadCount(0);
    } catch {
      setError("Failed to mark all notifications as read.");
    }
  }, []);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const existing = notifications.find((n) => n._id === notificationId);
      const wasUnread = existing ? existing.isRead !== true : false;

      setError(null);
      try {
        await notificationService.deleteNotification(notificationId);
        setNotifications((prev) =>
          prev.filter((n) => n._id !== notificationId),
        );

        if (wasUnread) {
          setUnreadCount((prev) => Math.max(prev - 1, 0));
        }
      } catch {
        setError("Failed to delete notification.");
      }
    },
    [notifications],
  );

  const dismissToast = useCallback((notificationId: string) => {
    setToasts((prev) => prev.filter((item) => item._id !== notificationId));
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      toasts,
      isLoading,
      error,
      refreshNotifications,
      markNotificationRead,
      markAllRead,
      deleteNotification,
      dismissToast,
    }),
    [
      notifications,
      unreadCount,
      toasts,
      isLoading,
      error,
      refreshNotifications,
      markNotificationRead,
      markAllRead,
      deleteNotification,
      dismissToast,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
