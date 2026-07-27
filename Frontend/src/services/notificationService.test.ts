import { describe, it, expect, vi, beforeEach } from "vitest";
import * as notificationService from "./notificationService";
import api from "./api";
import type { Notification } from "../types";

vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const mockNotification: Notification = {
  _id: "notif-1",
  recipientId: "user-1",
  type: "new_message",
  title: "New message",
  body: "You have a new message",
  isRead: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getNotifications", () => {
  it("gets /notifications and returns the list", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: [mockNotification] },
    });

    const result = await notificationService.getNotifications(10, 5);

    expect(mockedApi.get).toHaveBeenCalledWith("/notifications", {
      params: { limit: 10, skip: 5 },
    });
    expect(result).toEqual([mockNotification]);
  });
});

describe("getUnreadCount", () => {
  it("gets /notifications/unread-count and returns the count", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { count: 4 } },
    });

    const result = await notificationService.getUnreadCount();

    expect(mockedApi.get).toHaveBeenCalledWith("/notifications/unread-count");
    expect(result).toBe(4);
  });
});

describe("markNotificationRead", () => {
  it("puts to /notifications/:id/read and returns updated notification", async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { success: true, data: { ...mockNotification, isRead: true } },
    });

    const result = await notificationService.markNotificationRead("notif-1");

    expect(mockedApi.put).toHaveBeenCalledWith("/notifications/notif-1/read");
    expect(result.isRead).toBe(true);
  });
});

describe("markAllNotificationsRead", () => {
  it("puts to /notifications/mark-all-read and returns summary", async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { success: true, data: { message: "ok", modifiedCount: 3 } },
    });

    const result = await notificationService.markAllNotificationsRead();

    expect(mockedApi.put).toHaveBeenCalledWith("/notifications/mark-all-read");
    expect(result.modifiedCount).toBe(3);
  });
});

describe("deleteNotification", () => {
  it("deletes /notifications/:id and returns message", async () => {
    mockedApi.delete.mockResolvedValueOnce({
      data: { success: true, data: { message: "deleted" } },
    });

    const result = await notificationService.deleteNotification("notif-1");

    expect(mockedApi.delete).toHaveBeenCalledWith("/notifications/notif-1");
    expect(result.message).toBe("deleted");
  });
});
