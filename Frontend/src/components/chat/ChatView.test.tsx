import { render, screen, act } from "@testing-library/react";
import { ChatView } from "./ChatView";
import { useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { useMessages } from "../../hooks/useMessages";
import { usePresence } from "../../hooks/usePresence";
import { useTypingIndicator } from "../../hooks/useTypingIndicator";
import { useDashboardPanel } from "../../hooks/useDashboardPanel";
import { vi, Mock } from "vitest";

type SocketListener = (...args: unknown[]) => void;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useParams: vi.fn() };
});
vi.mock("../../hooks/useAuth");
vi.mock("../../hooks/useSocket");
vi.mock("../../hooks/useMessages");
vi.mock("../../hooks/usePresence");
vi.mock("../../hooks/useTypingIndicator");
vi.mock("../../hooks/useDashboardPanel");
vi.mock("../../hooks/useCaseSocket");

// Mocking children components to simplify integration test
vi.mock("./ChatHeader", () => ({
  ChatHeader: () => <div data-testid="chat-header" />,
}));
vi.mock("./MessageList", () => ({
  MessageList: () => <div data-testid="message-list" />,
}));
vi.mock("./MessageInput", () => ({
  MessageInput: () => <div data-testid="message-input" />,
}));
vi.mock("./TypingIndicator", () => ({
  TypingIndicator: () => <div data-testid="typing-indicator" />,
}));

describe("ChatView", () => {
  let mockSocket: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
    (useParams as Mock).mockReturnValue({ caseId: "case-123" });
    (useAuth as Mock).mockReturnValue({ user: { _id: "u1" } });
    (useSocket as Mock).mockReturnValue({ socket: mockSocket });
    (useDashboardPanel as Mock).mockReturnValue({
      activePanel: null,
      togglePanel: vi.fn(),
    });
    (usePresence as Mock).mockReturnValue({ onlineUserIds: new Set() });
    (useTypingIndicator as Mock).mockReturnValue({
      typingUserNames: [],
      notifyTyping: vi.fn(),
    });
    (useMessages as Mock).mockReturnValue({
      messages: [],
      isLoading: false,
      appendMessage: vi.fn(),
      updateDeletedMessage: vi.fn(),
      updateMessageRead: vi.fn(),
    });
  });

  it("renders 'No case selected' if caseId is missing", () => {
    (useParams as Mock).mockReturnValue({ caseId: undefined });
    render(<ChatView />);
    expect(screen.getByText(/no case selected/i)).toBeInTheDocument();
  });

  it("renders the chat layout when caseId is present", () => {
    render(<ChatView />);
    expect(screen.getByTestId("chat-header")).toBeInTheDocument();
    expect(screen.getByTestId("message-list")).toBeInTheDocument();
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });

  it("sets up socket listeners for new_message, message_deleted, message_read", () => {
    render(<ChatView />);
    expect(mockSocket.on).toHaveBeenCalledWith(
      "new_message",
      expect.any(Function),
    );
    expect(mockSocket.on).toHaveBeenCalledWith(
      "message_deleted",
      expect.any(Function),
    );
    expect(mockSocket.on).toHaveBeenCalledWith(
      "message_read",
      expect.any(Function),
    );
  });

  it("calls updateDeletedMessage when message_deleted event is received", () => {
    const updateDeletedMessage = vi.fn();
    (useMessages as Mock).mockReturnValue({
      messages: [],
      isLoading: false,
      appendMessage: vi.fn(),
      updateDeletedMessage,
      updateMessageRead: vi.fn(),
    });

    let handleMessageDeleted: SocketListener = () => {};
    mockSocket.on.mockImplementation((event: string, cb: SocketListener) => {
      if (event === "message_deleted") handleMessageDeleted = cb;
    });

    render(<ChatView />);

    const payload = {
      messageId: "m1",
      caseId: "case-123",
      deletedAt: new Date().toISOString(),
    };
    act(() => {
      handleMessageDeleted(payload);
    });

    expect(updateDeletedMessage).toHaveBeenCalledWith({
      messageId: "m1",
      deletedAt: payload.deletedAt,
    });
  });
});
