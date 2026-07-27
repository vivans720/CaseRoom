import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReplyPreview } from "./ReplyPreview";
import type { Message, User } from "../../types";

describe("ReplyPreview", () => {
  const mockMessage: Message = {
    _id: "msg-123",
    caseId: "case-123",
    senderId: { _id: "user-1", name: "John Doe" } as unknown as User,
    type: "text",
    content: "Hello world!",
    isDeleted: false,
    readBy: [],
    createdAt: "2026-04-16T12:00:00.000Z",
    updatedAt: "2026-04-16T12:00:00.000Z",
  };

  it("does not render if message is null", () => {
    const { container } = render(
      <ReplyPreview message={null} onCancel={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the sender name and content for text messages", () => {
    render(<ReplyPreview message={mockMessage} onCancel={() => {}} />);
    expect(screen.getByText("Replying to John Doe")).toBeInTheDocument();
    expect(screen.getByText("Hello world!")).toBeInTheDocument();
  });

  it("renders the file name for file messages", () => {
    const fileMessage: Message = {
      ...mockMessage,
      type: "image",
      content: "",
      fileName: "photo.jpg",
    };
    render(<ReplyPreview message={fileMessage} onCancel={() => {}} />);
    expect(screen.getByText("Replying to John Doe")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
  });

  it("calls onCancel when close button is clicked", () => {
    const onCancelMock = vi.fn();
    render(<ReplyPreview message={mockMessage} onCancel={onCancelMock} />);

    // The close button has aria-label="Cancel reply"
    fireEvent.click(screen.getByLabelText("Cancel reply"));
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });
});
