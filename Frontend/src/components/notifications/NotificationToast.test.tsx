import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificationToast } from "./NotificationToast";
import { useNotifications } from "../../hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { vi, Mock } from "vitest";

type ToastProps = {
  title: string;
  description?: string;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
};

vi.mock("../../hooks/useNotifications");
vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));
vi.mock("../ui/Toast", () => ({
  Toast: ({ title, description, onClose, action }: ToastProps) => (
    <div data-testid="toast">
      <span>{title}</span>
      <span>{description}</span>
      <button onClick={onClose}>Dismiss</button>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
}));

describe("NotificationToast", () => {
  const mockNavigate = vi.fn();
  const mockDismissToast = vi.fn();
  const mockMarkNotificationRead = vi.fn();

  const mockToasts = [
    {
      _id: "1",
      title: "New Message",
      body: "Hello",
      caseId: "case-1",
      isRead: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
    (useNotifications as Mock).mockReturnValue({
      toasts: mockToasts,
      dismissToast: mockDismissToast,
      markNotificationRead: mockMarkNotificationRead,
    });
  });

  it("renders nothing when there are no toasts", () => {
    (useNotifications as Mock).mockReturnValue({
      toasts: [],
      dismissToast: mockDismissToast,
      markNotificationRead: mockMarkNotificationRead,
    });
    const { container } = render(<NotificationToast />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toasts when they exist", () => {
    render(<NotificationToast />);
    expect(screen.getByText("New Message")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls dismissToast when Toast onClose is triggered", () => {
    render(<NotificationToast />);
    fireEvent.click(screen.getByText("Dismiss"));
    expect(mockDismissToast).toHaveBeenCalledWith("1");
  });

  it("handles notification opening from toast", async () => {
    render(<NotificationToast />);

    await act(async () => {
      fireEvent.click(screen.getByText("Open case"));
    });

    expect(mockMarkNotificationRead).toHaveBeenCalledWith("1");
    expect(mockNavigate).toHaveBeenCalledWith("/case/case-1");
    expect(mockDismissToast).toHaveBeenCalledWith("1");
  });
});
