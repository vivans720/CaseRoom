import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationItem } from "./NotificationItem";
import type { Notification } from "../../types";

describe("NotificationItem", () => {
  const mockNotification: Notification = {
    _id: "1",
    recipientId: "user-1",
    type: "new_message",
    title: "New Message",
    body: "You have a new message",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isRead: false,
  };

  it("renders notification details", () => {
    render(
      <NotificationItem
        notification={mockNotification}
        onOpen={vi.fn()}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("New Message")).toBeInTheDocument();
    expect(screen.getByText("You have a new message")).toBeInTheDocument();
    // Use getAllByText or better, look for the badge/label specifically
    expect(screen.getAllByText(/Message/i).length).toBeGreaterThan(0);
  });

  it("calls onOpen when item is clicked", () => {
    const onOpen = vi.fn();
    render(
      <NotificationItem
        notification={mockNotification}
        onOpen={onOpen}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    // The main li has role="button" and aria-label="Message notification"
    fireEvent.click(screen.getByLabelText(/Message notification/i));
    expect(onOpen).toHaveBeenCalledWith(mockNotification);
  });

  it("calls onMarkRead when 'Mark read' is clicked", () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationItem
        notification={mockNotification}
        onOpen={vi.fn()}
        onMarkRead={onMarkRead}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/mark read/i));
    expect(onMarkRead).toHaveBeenCalledWith("1");
  });

  it("calls onDelete when 'Delete' is clicked", () => {
    const onDelete = vi.fn();
    render(
      <NotificationItem
        notification={mockNotification}
        onOpen={vi.fn()}
        onMarkRead={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByText(/delete/i));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("does not show 'Mark read' when notification is already read", () => {
    const readNotification = { ...mockNotification, isRead: true };
    render(
      <NotificationItem
        notification={readNotification}
        onOpen={vi.fn()}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText(/mark read/i)).not.toBeInTheDocument();
  });

  it("renders Mention label for mention notifications", () => {
    render(
      <NotificationItem
        notification={{ ...mockNotification, type: "mentioned_in_message" }}
        onOpen={vi.fn()}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Mention")).toBeInTheDocument();
  });
});
