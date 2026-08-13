import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MessageBubble } from "./MessageBubble";
import type { Message, User } from "../../types";

vi.mock("../../services/annotationService", () => ({
  annotationService: {
    getAnnotations: vi.fn().mockResolvedValue([]),
  }
}));

describe("MessageBubble", () => {
  const mockMessage: Message = {
    _id: "msg-1",
    caseId: "case-1",
    senderId: { _id: "user-1", name: "Alice" } as unknown as User,
    type: "text",
    content: "Hello World",
    isDeleted: false,
    readBy: [],
    createdAt: "2026-04-16T12:00:00Z",
    updatedAt: "2026-04-16T12:00:00Z",
  };

  it("renders message content and sender name correctly", () => {
    render(
      <MessageBubble
        message={mockMessage}
        isOwn={false}
        showSender={true}
        currentUserId="user-1"
      />,
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows deleted state properly", () => {
    render(
      <MessageBubble
        message={{ ...mockMessage, isDeleted: true }}
        isOwn={true}
        showSender={false}
        currentUserId="user-1"
      />,
    );
    expect(
      screen.getByText("🚫 This message was deleted."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hello World")).not.toBeInTheDocument();
  });

  it("calls onReply correctly when reply button is clicked", () => {
    const handleReply = vi.fn();
    render(
      <MessageBubble
        message={mockMessage}
        isOwn={false}
        showSender={true}
        onReply={handleReply}
        currentUserId="user-1"
      />,
    );

    const replyBtn = screen.getByTitle("Reply");
    fireEvent.click(replyBtn);
    expect(handleReply).toHaveBeenCalledWith(mockMessage);
  });

  it("shows delete button only if the message belongs to the current user (isOwn) and calls onDelete", () => {
    const handleDelete = vi.fn();

    // Not own message
    const { rerender } = render(
      <MessageBubble
        message={mockMessage}
        isOwn={false}
        showSender={true}
        onDelete={handleDelete}
        currentUserId="user-1"
      />,
    );
    expect(screen.queryByTitle("Delete for everyone")).not.toBeInTheDocument();

    // Own message
    rerender(
      <MessageBubble
        message={mockMessage}
        isOwn={true}
        showSender={false}
        onDelete={handleDelete}
        currentUserId="user-1"
      />,
    );
    const deleteBtn = screen.getByTitle("Delete for everyone");
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(mockMessage);
  });

  it("hides action buttons if message is deleted", () => {
    // Both isOwn and not isOwn, but isDeleted = true should hide buttons context
    render(
      <MessageBubble
        message={{ ...mockMessage, isDeleted: true }}
        isOwn={true}
        showSender={false}
        onReply={() => {}}
        onDelete={() => {}}
        currentUserId="user-1"
      />,
    );
    expect(screen.queryByTitle("Delete for everyone")).not.toBeInTheDocument();
  });

  it("renders fileName in reply preview for file attachments", () => {
    const replyMessage: Message = {
      ...mockMessage,
      _id: "msg-reply",
      content: "Nice file!",
      replyTo: {
        _id: "msg-parent",
        senderId: { _id: "user-2", name: "Bob" } as unknown as User,
        content: "Parent content",
        fileName: "important-doc.pdf",
      },
    };

    render(
      <MessageBubble
        message={replyMessage}
        isOwn={false}
        showSender={true}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText("important-doc.pdf")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows Edited label when message has editedAt", () => {
    render(
      <MessageBubble
        message={{ ...mockMessage, editedAt: "2026-04-16T12:05:00Z" }}
        isOwn={true}
        showSender={false}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText("Edited")).toBeInTheDocument();
  });

  it("renders caption for file messages", () => {
    const fileMessage: Message = {
      ...mockMessage,
      type: "document",
      content: "Quarterly report",
      fileName: "q1-report.pdf",
      fileUrl: "https://example.com/q1-report.pdf",
    };

    render(
      <MessageBubble
        message={fileMessage}
        isOwn={false}
        showSender={true}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText("Quarterly report")).toBeInTheDocument();
    expect(screen.getByText("q1-report.pdf")).toBeInTheDocument();
  });

  it("highlights mentions in text messages", () => {
    render(
      <MessageBubble
        message={{
          ...mockMessage,
          content: "Please review @Alice",
          mentions: [{ _id: "user-1", name: "Alice" } as unknown as User],
        }}
        isOwn={false}
        showSender={true}
        currentUserId="user-1"
      />,
    );

    const mention = screen.getByText("@Alice");
    expect(mention).toBeInTheDocument();
    expect(mention).toHaveClass("text-primary");
  });

  describe("Reactions", () => {
    it("renders reactions correctly", () => {
      const msgWithReactions: Message = {
        ...mockMessage,
        reactions: [
          { emoji: "👍", userIds: ["user-1", "user-2"] },
          { emoji: "❤️", userIds: ["user-1"] },
        ],
      };

      render(
        <MessageBubble
          message={msgWithReactions}
          isOwn={false}
          showSender={true}
          currentUserId="user-1"
        />,
      );

      expect(screen.getByText("👍")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("❤️")).toBeInTheDocument();
      // Reaction count for length 1 is hidden in the new UI to match WhatsApp
      expect(screen.queryByText("1")).not.toBeInTheDocument();
    });

    it("does not show picker on row hover", () => {
      render(
        <MessageBubble
          message={mockMessage}
          isOwn={false}
          showSender={true}
          currentUserId="user-1"
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId("message-bubble-row"));

      expect(screen.queryByText("❤️")).not.toBeInTheDocument();
    });

    it("shows picker on reaction trigger hover", () => {
      render(
        <MessageBubble
          message={mockMessage}
          isOwn={false}
          showSender={true}
          currentUserId="user-1"
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId("message-bubble-row"));
      fireEvent.mouseEnter(screen.getByTestId("reaction-trigger"));

      expect(screen.getByText("❤️")).toBeInTheDocument();
      expect(screen.getByText("👍")).toBeInTheDocument();
    });

    it("keeps picker open after clicking reaction trigger", () => {
      render(
        <MessageBubble
          message={mockMessage}
          isOwn={false}
          showSender={true}
          currentUserId="user-1"
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId("message-bubble-row"));
      const trigger = screen.getByTestId("reaction-trigger");

      fireEvent.click(trigger);
      fireEvent.mouseLeave(trigger);

      expect(screen.getByText("❤️")).toBeInTheDocument();
      expect(screen.getByTestId("reaction-picker")).toBeInTheDocument();
    });

    it("closes picker when reaction trigger is clicked again", () => {
      render(
        <MessageBubble
          message={mockMessage}
          isOwn={false}
          showSender={true}
          currentUserId="user-1"
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId("message-bubble-row"));
      const trigger = screen.getByTestId("reaction-trigger");

      fireEvent.click(trigger);
      expect(screen.getByTestId("reaction-picker")).toBeInTheDocument();

      fireEvent.click(trigger);
      expect(screen.queryByTestId("reaction-picker")).not.toBeInTheDocument();
    });

    it("shows reaction picker on hover and calls onToggleReaction", () => {
      const handleToggle = vi.fn();
      render(
        <MessageBubble
          message={mockMessage}
          isOwn={false}
          showSender={true}
          currentUserId="user-1"
          onToggleReaction={handleToggle}
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId("message-bubble-row"));
      fireEvent.mouseEnter(screen.getByTestId("reaction-trigger"));

      // Check if one of the emojis in the picker appears
      const emojiBtn = screen.getByText("❤️");
      fireEvent.click(emojiBtn);

      expect(handleToggle).toHaveBeenCalledWith(mockMessage._id, "❤️");
    });

    it("calls onToggleReaction when clicking an existing reaction badge", () => {
      const handleToggle = vi.fn();
      const msgWithReactions: Message = {
        ...mockMessage,
        reactions: [{ emoji: "😂", userIds: ["user-2"] }],
      };

      render(
        <MessageBubble
          message={msgWithReactions}
          isOwn={false}
          showSender={true}
          currentUserId="user-1"
          onToggleReaction={handleToggle}
        />,
      );

      const reactionBadge = screen.getByText("😂");
      fireEvent.click(reactionBadge);

      expect(handleToggle).toHaveBeenCalledWith(mockMessage._id, "😂");
    });
  });

  it("renders image attachment and clicking it opens the ImagePreviewModal instead of downloading", () => {
    const imageMessage: Message = {
      _id: "msg-img-1",
      caseId: "case-1",
      senderId: { _id: "user-2", name: "Bob" } as unknown as User,
      type: "image",
      content: "Lovely scenery",
      fileName: "scenery.png",
      fileUrl: "http://example.com/scenery.png",
      isDeleted: false,
      readBy: [],
      createdAt: "2026-06-01T12:00:00.000Z",
    };

    render(
      <MessageBubble
        message={imageMessage}
        isOwn={false}
        showSender={true}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText("Lovely scenery")).toBeInTheDocument();
    const img = screen.getByAltText("scenery.png");
    expect(img).toBeInTheDocument();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(img.parentElement!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Zoom In")).toBeInTheDocument();
  });

  it("copies message content to clipboard when copy button clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <MessageBubble
        message={mockMessage}
        isOwn={false}
        showSender={true}
        currentUserId="user-1"
      />,
    );

    const copyBtn = screen.getByTitle("Copy message");
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith("Hello World");
    const copiedBtn = await screen.findByTitle("Copied");
    expect(copiedBtn).toBeInTheDocument();
  });

  it("does not show copy button if message is deleted or has no content", () => {
    const { rerender } = render(
      <MessageBubble
        message={{ ...mockMessage, isDeleted: true }}
        isOwn={false}
        showSender={true}
        currentUserId="user-1"
      />,
    );
    expect(screen.queryByTitle("Copy message")).not.toBeInTheDocument();

    rerender(
      <MessageBubble
        message={{ ...mockMessage, content: "" }}
        isOwn={false}
        showSender={true}
        currentUserId="user-1"
      />,
    );
    expect(screen.queryByTitle("Copy message")).not.toBeInTheDocument();
  });
});
