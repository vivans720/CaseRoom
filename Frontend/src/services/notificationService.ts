import api from "./api";
import type { Notification } from "../types";

const DEFAULT_LIMIT = 20;
const DEFAULT_SKIP = 0;

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
}

interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
}

interface NotificationResponse {
  success: boolean;
  data: Notification;
}

interface MarkAllReadResponse {
  success: boolean;
  data: { message: string; modifiedCount: number };
}

interface DeleteNotificationResponse {
  success: boolean;
  data: { message: string };
}

export const getNotifications = async (
  limit: number = DEFAULT_LIMIT,
  skip: number = DEFAULT_SKIP,
): Promise<Notification[]> => {
  const response = await api.get<NotificationsResponse>("/notifications", {
    params: { limit, skip },
  });
  return response.data.data;
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<UnreadCountResponse>(
    "/notifications/unread-count",
  );
  return response.data.data.count;
};

export const markNotificationRead = async (
  notificationId: string,
): Promise<Notification> => {
  const response = await api.put<NotificationResponse>(
    `/notifications/${notificationId}/read`,
  );
  return response.data.data;
};

export const markAllNotificationsRead = async (): Promise<{
  message: string;
  modifiedCount: number;
}> => {
  const response = await api.put<MarkAllReadResponse>(
    "/notifications/mark-all-read",
  );
  return response.data.data;
};

export const deleteNotification = async (
  notificationId: string,
): Promise<{ message: string }> => {
  const response = await api.delete<DeleteNotificationResponse>(
    `/notifications/${notificationId}`,
  );
  return response.data.data;
};
