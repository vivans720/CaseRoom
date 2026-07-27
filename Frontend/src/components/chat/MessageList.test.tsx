import { render, screen } from "@testing-library/react";
import { MessageList } from "./MessageList";
import { vi, Mock } from "vitest";
import { useReadReceipts } from "../../hooks/useReadReceipts";

type MessageBubbleProps = {
  message: { content: string };
  isOwn: boolean;
};

vi.mock("../../hooks/useReadReceipts");
vi.mock("./MessageBubble", () => ({
  MessageBubble: ({ message, isOwn }: MessageBubbleProps) => (
    <div data-testid="message-bubble">
      {message.content} - {isOwn ? "own" : "received"}
    </div>
  ),
}));

// Mock IntersectionObserver
const observe = vi.fn();
const unobserve = vi.fn();
const disconnect = vi.fn();

class IntersectionObserverMock {
  observe = observe;
  unobserve = unobserve;
  disconnect = disconnect;
}

// @ts-expect-error test shim for JSDOM
window.IntersectionObserver = IntersectionObserverMock;

describe("MessageList", () => {
  const mockMessages = [
    {
      _id: "1",
      content: "Hello",
      senderId: "u1",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "2",
      content: "Hi",
      senderId: "u2",
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useReadReceipts as Mock).mockReturnValue({ messageRef: vi.fn() });
  });

  it("renders loading skeleton when isLoading is true and messages empty", () => {
    render(
      <MessageList
        caseId="c1"
        messages={[]}
        isLoading={true}
        isLoadingMore={false}
        hasMore={false}
        loadMore={vi.fn()}
        currentUserId="u1"
      />,
    );
    expect(screen.getByLabelText(/loading messages/i)).toBeInTheDocument();
  });

  it("renders empty state message when messages array is empty", () => {
    render(
      <MessageList
        caseId="c1"
        messages={[]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        loadMore={vi.fn()}
        currentUserId="u1"
      />,
    );
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/say hello and start the conversation/i),
    ).toBeInTheDocument();
  });

  it("renders a list of messages", () => {
    render(
      <MessageList
        caseId="c1"
        messages={mockMessages}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        loadMore={vi.fn()}
        currentUserId="u1"
      />,
    );
    const bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0].textContent).toContain("Hello - own");
    expect(bubbles[1].textContent).toContain("Hi - received");
  });

  it("renders date separators", () => {
    render(
      <MessageList
        caseId="c1"
        messages={mockMessages}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        loadMore={vi.fn()}
        currentUserId="u1"
      />,
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("shows 'Beginning of conversation' if hasMore is false", () => {
    render(
      <MessageList
        caseId="c1"
        messages={mockMessages}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        loadMore={vi.fn()}
        currentUserId="u1"
      />,
    );
    expect(screen.getByText(/beginning of conversation/i)).toBeInTheDocument();
  });
});
