import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "./MessageInput";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import * as messageService from "../../services/messageService";
import { vi, Mock } from "vitest";
import type { Message, User } from "../../types";

type EmojiPickerProps = {
  onEmojiClick: (value: { emoji: string }) => void;
};

type FileUploadButtonProps = {
  onFileSelect: (file: File) => void;
};

type ReplyPreviewProps = {
  onCancel: () => void;
};

type MockSocket = {
  emit: ReturnType<typeof vi.fn>;
};

const createUser = (overrides: Partial<User> = {}): User => ({
  _id: "u-2",
  employeeId: "EMP002",
  name: "John",
  email: "john@example.com",
  phone: "555-1234",
  lastSeen: null,
  pinnedCases: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMessage = (overrides: Partial<Message> = {}): Message => ({
  _id: "m1",
  caseId: "c1",
  senderId: "current-user",
  type: "text",
  content: "Original",
  isDeleted: false,
  readBy: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

vi.mock("../../hooks/useSocket");
vi.mock("../../hooks/useAuth");
vi.mock("../../services/messageService");
vi.mock("emoji-picker-react", () => ({
  default: ({ onEmojiClick }: EmojiPickerProps) => (
    <div data-testid="emoji-picker">
      <button onClick={() => onEmojiClick({ emoji: "😀" })}>
        Pick grinning
      </button>
      <button onClick={() => onEmojiClick({ emoji: "🎯" })}>Pick target</button>
    </div>
  ),
}));
vi.mock("./FileUploadButton", () => ({
  FileUploadButton: ({ onFileSelect }: FileUploadButtonProps) => (
    <button
      data-testid="upload-btn"
      onClick={() =>
        onFileSelect(new File([""], "test.pdf", { type: "application/pdf" }))
      }
    >
      Upload
    </button>
  ),
}));
vi.mock("./ReplyPreview", () => ({
  ReplyPreview: ({ onCancel }: ReplyPreviewProps) => (
    <div data-testid="reply-preview">
      Reply
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe("MessageInput", () => {
  let mockSocket: MockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = { emit: vi.fn() };
    (useAuth as Mock).mockReturnValue({
      user: { _id: "current-user" },
    });
    (useSocket as Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
    });
    vi.mocked(messageService.getCaseParticipants).mockResolvedValue([]);
  });

  it("renders the input and send button", () => {
    render(<MessageInput caseId="c1" isArchived={false} />);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Send message")).toBeInTheDocument();
    expect(screen.getByLabelText("Open emoji picker")).toBeInTheDocument();
  });

  it("renders archived notice when isArchived is true", () => {
    render(<MessageInput caseId="c1" isArchived={true} />);
    expect(screen.getByText(/case archived/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this case has been archived/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/type a message/i),
    ).not.toBeInTheDocument();
  });

  it("calls onTyping when user types", async () => {
    const onTyping = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput caseId="c1" isArchived={false} onTyping={onTyping} />);

    await user.type(screen.getByPlaceholderText(/type a message/i), "Hello");
    expect(onTyping).toHaveBeenCalled();
  });

  it("emits send_message via socket when send is clicked", async () => {
    const user = userEvent.setup();
    render(<MessageInput caseId="c1" isArchived={false} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, "Hello world");
    await user.click(screen.getByLabelText("Send message"));

    expect(mockSocket.emit).toHaveBeenCalledWith("send_message", {
      caseId: "c1",
      content: "Hello world",
    });
    expect(input).toHaveValue("");
  });

  it("emits send_message with replyToId when replying", async () => {
    const user = userEvent.setup();
    const onCancelReply = vi.fn();
    const replyTo = createMessage({ content: "Original" });

    render(
      <MessageInput
        caseId="c1"
        isArchived={false}
        replyToMessage={replyTo}
        onCancelReply={onCancelReply}
      />,
    );

    await user.type(screen.getByPlaceholderText(/type a message/i), "Replying");
    await user.click(screen.getByLabelText("Send message"));

    expect(mockSocket.emit).toHaveBeenCalledWith("send_message", {
      caseId: "c1",
      content: "Replying",
      replyToId: "m1",
    });
    expect(onCancelReply).toHaveBeenCalled();
  });

  it("uploads a file when send is clicked with a selected file", async () => {
    const user = userEvent.setup();
    vi.mocked(messageService.uploadFileMessage).mockResolvedValue({} as never);

    render(<MessageInput caseId="c1" isArchived={false} />);

    // Select file via mock button
    await user.click(screen.getByTestId("upload-btn"));
    expect(screen.getByText("test.pdf")).toBeInTheDocument();

    // Send
    await user.click(screen.getByLabelText("Send message"));

    expect(messageService.uploadFileMessage).toHaveBeenCalledWith(
      "c1",
      expect.any(File),
      "",
      undefined,
      [],
      expect.any(Function),
    );
    await waitFor(() =>
      expect(screen.queryByText("test.pdf")).not.toBeInTheDocument(),
    );
  });

  it("sends message on Enter key press", async () => {
    const user = userEvent.setup();
    render(<MessageInput caseId="c1" isArchived={false} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, "Hello{Enter}");

    expect(mockSocket.emit).toHaveBeenCalledWith("send_message", {
      caseId: "c1",
      content: "Hello",
    });
  });

  it("does not send message on Shift+Enter", () => {
    render(<MessageInput caseId="c1" isArchived={false} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("opens picker on emoji button click", async () => {
    const user = userEvent.setup();
    render(<MessageInput caseId="c1" isArchived={false} />);

    expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Open emoji picker"));
    expect(await screen.findByTestId("emoji-picker")).toBeInTheDocument();
  });

  it("inserts selected emoji at cursor position", async () => {
    const user = userEvent.setup();
    render(<MessageInput caseId="c1" isArchived={false} />);

    const input = screen.getByLabelText("Message input") as HTMLTextAreaElement;
    await user.type(input, "hello world");
    input.setSelectionRange(5, 5);

    await user.click(screen.getByLabelText("Open emoji picker"));
    await user.click(screen.getByRole("button", { name: /pick grinning/i }));

    await waitFor(() => {
      expect(input.value).toBe("hello😀 world");
    });
  });

  it("keeps text and allows multiple emoji inserts", async () => {
    const user = userEvent.setup();
    render(<MessageInput caseId="c1" isArchived={false} />);

    const input = screen.getByLabelText("Message input") as HTMLTextAreaElement;
    await user.type(input, "Go");

    await user.click(screen.getByLabelText("Open emoji picker"));
    await user.click(screen.getByRole("button", { name: /pick grinning/i }));
    await user.click(screen.getByRole("button", { name: /pick target/i }));

    await waitFor(() => {
      expect(input.value).toBe("Go😀🎯");
    });
    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
  });

  it("closes picker on outside click", async () => {
    const user = userEvent.setup();
    render(<MessageInput caseId="c1" isArchived={false} />);

    await user.click(screen.getByLabelText("Open emoji picker"));
    expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });
  });

  it("closes picker after send", async () => {
    const user = userEvent.setup();
    render(<MessageInput caseId="c1" isArchived={false} />);

    await user.click(screen.getByLabelText("Open emoji picker"));
    await user.type(screen.getByLabelText("Message input"), "hello");
    await user.click(screen.getByLabelText("Send message"));

    await waitFor(() => {
      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });
  });

  it("shows mention suggestions and inserts selected mention", async () => {
    const user = userEvent.setup();
    vi.mocked(messageService.getCaseParticipants).mockResolvedValue([
      createUser(),
    ]);

    render(<MessageInput caseId="c1" isArchived={false} />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "@jo");

    expect(
      await screen.findByRole("listbox", { name: /mention suggestions/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /john/i }));
    expect(input).toHaveValue("@John ");
  });

  it("sends mentionedUserIds for matched mentions", async () => {
    const user = userEvent.setup();
    vi.mocked(messageService.getCaseParticipants).mockResolvedValue([
      createUser(),
    ]);

    render(<MessageInput caseId="c1" isArchived={false} />);

    const input = screen.getByLabelText("Message input");
    await user.type(input, "Hello @John");
    await user.click(screen.getByLabelText("Send message"));

    expect(mockSocket.emit).toHaveBeenCalledWith("send_message", {
      caseId: "c1",
      content: "Hello @John",
      mentionedUserIds: ["u-2"],
    });
  });
});
