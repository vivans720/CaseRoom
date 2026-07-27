import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificationPanel } from "./NotificationPanel";
import { useNotifications } from "../../hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { vi, Mock } from "vitest";

type NotificationItemProps = {
  notification: {
    _id: string;
    title: string;
    caseId?: string;
  };
  onOpen: (notification: NotificationItemProps["notification"]) => void;
  onMarkRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
};

vi.mock("../../hooks/useNotifications");
vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));
vi.mock("./NotificationItem", () => ({
  NotificationItem: ({
    notification,
    onOpen,
    onMarkRead,
    onDelete,
  }: NotificationItemProps) => (
    <li data-testid="notification-item">
      {notification.title}
      <button onClick={() => onOpen(notification)}>Open</button>
      <button onClick={() => onMarkRead(notification._id)}>Mark Read</button>
      <button onClick={() => onDelete(notification._id)}>Delete</button>
    </li>
  ),
}));

describe("NotificationPanel", () => {
  const mockNavigate = vi.fn();
  const mockMarkNotificationRead = vi.fn();
  const mockMarkAllRead = vi.fn();
  const mockDeleteNotification = vi.fn();

  const mockNotifs = [
    {
      _id: "1",
      title: "Notif 1",
      isRead: false,
      caseId: "case-1",
      type: "new_message",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
    (useNotifications as Mock).mockReturnValue({
      notifications: mockNotifs,
      unreadCount: 1,
      isLoading: false,
      error: null,
      markNotificationRead: mockMarkNotificationRead,
      markAllRead: mockMarkAllRead,
      deleteNotification: mockDeleteNotification,
    });
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <NotificationPanel isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders notification list when isOpen is true", () => {
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByTestId("notification-item")).toBeInTheDocument();
  });

  it("calls markAllRead when clicking the button", async () => {
    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByText(/mark all read/i));
    });

    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it("handles opening a notification (marks read and navigates)", async () => {
    const onClose = vi.fn();
    render(<NotificationPanel isOpen={true} onClose={onClose} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Open"));
    });

    expect(mockMarkNotificationRead).toHaveBeenCalledWith("1");
    expect(mockNavigate).toHaveBeenCalledWith("/case/case-1");
    expect(onClose).toHaveBeenCalled();
  });

  it("displays empty state when no notifications are present", () => {
    (useNotifications as Mock).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
  });

  it("renders loading spinner when isLoading is true and no notifications", () => {
    (useNotifications as Mock).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: true,
      error: null,
    });

    render(<NotificationPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
