import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { NotificationProvider } from "../contexts/NotificationContext";
import { useNotifications } from "./useNotifications";
import * as notificationService from "../services/notificationService";
import type { Notification } from "../types";

vi.mock("../services/notificationService");

const mockedNotificationService = vi.mocked(notificationService);

type Listener = (payload: Notification) => void;

const listeners: Record<string, Listener[]> = {};

const mockSocket = {
  on: (event: string, fn: Listener) => {
    listeners[event] = listeners[event] ?? [];
    listeners[event].push(fn);
  },
  off: (event: string, fn: Listener) => {
    listeners[event] = (listeners[event] ?? []).filter(
      (listener) => listener !== fn,
    );
  },
  emit: vi.fn(),
};

vi.mock("./useSocket", () => ({
  useSocket: () => ({
    socket: mockSocket,
    isConnected: true,
  }),
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { _id: "user-1", name: "Test User" },
  }),
}));

const fire = (event: string, payload: Notification) => {
  (listeners[event] ?? []).forEach((fn) => fn(payload));
};

const makeNotification = (
  overrides: Partial<Notification> = {},
): Notification => ({
  _id: "notif-1",
  recipientId: "user-1",
  type: "new_message",
  title: "New message",
  body: "Message body",
  isRead: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(listeners).forEach((key) => delete listeners[key]);
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe("useNotifications", () => {
  it("loads notifications and unread count on mount", async () => {
    const list = [makeNotification(), makeNotification({ _id: "notif-2" })];
    mockedNotificationService.getNotifications.mockResolvedValue(list);
    mockedNotificationService.getUnreadCount.mockResolvedValue(2);

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toEqual(list);
    expect(result.current.unreadCount).toBe(2);
  });

  it("marks a single notification as read and updates count", async () => {
    const list = [makeNotification(), makeNotification({ _id: "notif-2" })];
    mockedNotificationService.getNotifications.mockResolvedValue(list);
    mockedNotificationService.getUnreadCount.mockResolvedValue(2);
    mockedNotificationService.markNotificationRead.mockResolvedValue({
      ...list[0],
      isRead: true,
      readAt: "2024-01-01T01:00:00.000Z",
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markNotificationRead("notif-1");
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications[0].isRead).toBe(true);
  });

  it("marks all notifications as read", async () => {
    const list = [makeNotification(), makeNotification({ _id: "notif-2" })];
    mockedNotificationService.getNotifications.mockResolvedValue(list);
    mockedNotificationService.getUnreadCount.mockResolvedValue(2);
    mockedNotificationService.markAllNotificationsRead.mockResolvedValue({
      message: "ok",
      modifiedCount: 2,
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.isRead)).toBe(true);
  });

  it("handles real-time new_notification events", async () => {
    const list = [makeNotification()];
    mockedNotificationService.getNotifications.mockResolvedValue(list);
    mockedNotificationService.getUnreadCount.mockResolvedValue(1);

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const incoming = makeNotification({ _id: "notif-3", title: "New alert" });

    act(() => {
      fire("new_notification", incoming);
    });

    expect(result.current.unreadCount).toBe(2);
    expect(result.current.notifications[0]._id).toBe("notif-3");
    expect(result.current.toasts[0]._id).toBe("notif-3");
  });
});
