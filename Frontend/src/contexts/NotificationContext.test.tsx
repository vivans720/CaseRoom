import { render, waitFor, act } from "@testing-library/react";
import {
  NotificationProvider,
  NotificationContext,
} from "./NotificationContext";
import * as notificationService from "../services/notificationService";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useContext, JSX } from "react";
import { vi, Mock } from "vitest";
import type { Notification } from "../types";

type SocketListener = (...args: unknown[]) => void;

vi.mock("../hooks/useAuth");
vi.mock("../hooks/useSocket");
vi.mock("../services/notificationService");

const TestComponent = (): JSX.Element => {
  const context = useContext(NotificationContext);
  if (!context) return <div>No context</div>;
  return (
    <div>
      <div data-testid="count">{context.unreadCount}</div>
      <div data-testid="notifs-length">{context.notifications.length}</div>
      <div data-testid="toasts-length">{context.toasts.length}</div>
      <div data-testid="isLoading">{context.isLoading.toString()}</div>
      <button onClick={() => context.markAllRead()}>Mark All Read</button>
    </div>
  );
};

describe("NotificationContext", () => {
  let mockSocket: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };
  const listeners: Record<string, SocketListener[]> = {};

  const createNotification = (
    overrides: Partial<Notification> = {},
  ): Notification => ({
    _id: "1",
    recipientId: "user-1",
    type: "new_message",
    title: "Test",
    body: "Body",
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset listeners
    Object.keys(listeners).forEach((key) => delete listeners[key]);

    mockSocket = {
      on: vi.fn((event: string, cb: SocketListener) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      off: vi.fn((event: string, cb: SocketListener) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((l) => l !== cb);
        }
      }),
    };
    (useAuth as Mock).mockReturnValue({ isAuthenticated: true });
    (useSocket as Mock).mockReturnValue({ socket: mockSocket });
  });

  it("fetches notifications on mount when authenticated", async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue([
      createNotification({ _id: "1", title: "Test" }),
    ]);
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(1);

    const { getByTestId } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    await waitFor(() =>
      expect(getByTestId("notifs-length").textContent).toBe("1"),
    );
    expect(getByTestId("count").textContent).toBe("1");
    expect(notificationService.getNotifications).toHaveBeenCalled();
  });

  it("handles real-time new_notification socket event", async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue([]);
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);

    const { getByTestId } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    await waitFor(() =>
      expect(getByTestId("isLoading").textContent).toBe("false"),
    );

    const newNotif = createNotification({
      _id: "2",
      title: "New",
      body: "New",
      caseId: "c1",
    });

    act(() => {
      listeners["new_notification"]?.forEach((cb) => cb(newNotif));
    });

    expect(getByTestId("notifs-length").textContent).toBe("1");
    expect(getByTestId("count").textContent).toBe("1");
    expect(getByTestId("toasts-length").textContent).toBe("1");
  });

  it("clears unread notifications when a message_read socket event is received for a case", async () => {
    const mockNotifs = [
      createNotification({ _id: "1", caseId: "c1" }),
      createNotification({ _id: "2", caseId: "c2" }),
    ];
    vi.mocked(notificationService.getNotifications).mockResolvedValue(
      mockNotifs,
    );
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(2);

    const { getByTestId } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => expect(getByTestId("count").textContent).toBe("2"));

    act(() => {
      listeners["message_read"]?.forEach((cb) => cb({ caseId: "c1" }));
    });

    expect(getByTestId("count").textContent).toBe("1");
  });

  it("marks all read correctly", async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue([
      createNotification({ _id: "1" }),
    ]);
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(1);
    vi.mocked(notificationService.markAllNotificationsRead).mockResolvedValue(
      undefined,
    );

    const { getByTestId, getByRole } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => expect(getByTestId("count").textContent).toBe("1"));

    await act(async () => {
      getByRole("button", { name: /mark all read/i }).click();
    });

    expect(getByTestId("count").textContent).toBe("0");
    expect(notificationService.markAllNotificationsRead).toHaveBeenCalled();
  });
});
