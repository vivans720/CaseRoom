import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContactPreviewModal } from "./ContactPreviewModal";
import type { User } from "../../types";

const mockUser: User = {
  _id: "user-123",
  employeeId: "EMP-001",
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  profilePictureUrl: "https://example.com/avatar.jpg",
  lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1h ago
  pinnedCases: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("ContactPreviewModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ContactPreviewModal
        isOpen={false}
        user={mockUser}
        isOnline={false}
        lastSeenTime={mockUser.lastSeen}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders user information correctly when open", () => {
    render(
      <ContactPreviewModal
        isOpen={true}
        user={mockUser}
        isOnline={true}
        lastSeenTime={null}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("+1234567890")).toBeInTheDocument();
  });

  it("displays Online status correctly", () => {
    render(
      <ContactPreviewModal
        isOpen={true}
        user={mockUser}
        isOnline={true}
        lastSeenTime={null}
        onClose={vi.fn()}
      />
    );

    const onlineStatus = screen.getByText("Online");
    expect(onlineStatus).toBeInTheDocument();
    expect(screen.getByText("Active now in conversation")).toBeInTheDocument();
  });

  it("displays Offline status with formatted last seen time", () => {
    render(
      <ContactPreviewModal
        isOpen={true}
        user={mockUser}
        isOnline={false}
        lastSeenTime={mockUser.lastSeen}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Last seen: 1h ago")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <ContactPreviewModal
        isOpen={true}
        user={mockUser}
        isOnline={true}
        lastSeenTime={null}
        onClose={handleClose}
      />
    );

    const closeButton = screen.getByRole("button", { name: "Close contact info" });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking on the backdrop", () => {
    const handleClose = vi.fn();
    render(
      <ContactPreviewModal
        isOpen={true}
        user={mockUser}
        isOnline={true}
        lastSeenTime={null}
        onClose={handleClose}
      />
    );

    const backdrop = screen.getByTestId("contact-preview-backdrop");
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking on the modal content card itself", () => {
    const handleClose = vi.fn();
    render(
      <ContactPreviewModal
        isOpen={true}
        user={mockUser}
        isOnline={true}
        lastSeenTime={null}
        onClose={handleClose}
      />
    );

    const card = screen.getByTestId("contact-preview-card");
    fireEvent.click(card);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(
      <ContactPreviewModal
        isOpen={true}
        user={mockUser}
        isOnline={true}
        lastSeenTime={null}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
