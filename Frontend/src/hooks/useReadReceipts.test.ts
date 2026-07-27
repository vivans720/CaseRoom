import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReadReceipts } from "./useReadReceipts";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";
import type { Message, User } from "../types";
import type { Socket } from "socket.io-client";

vi.mock("./useSocket");
vi.mock("./useAuth");

const mockedUseSocket = vi.mocked(useSocket);
const mockedUseAuth = vi.mocked(useAuth);

const mockMessage = (id: string, isOwn = false): Message => ({
  _id: id,
  caseId: "case-123",
  senderId: isOwn ? "user-me" : "user-other",
  type: "text",
  content: "hello",
  isDeleted: false,
  readBy: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

describe("useReadReceipts", () => {
  let mockSocketEmit: ReturnType<typeof vi.fn>;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    mockSocketEmit = vi.fn();
    mockedUseSocket.mockReturnValue({
      socket: { emit: mockSocketEmit, on: vi.fn(), off: vi.fn() } as unknown as Socket,
      isConnected: true,
    });

    mockedUseAuth.mockReturnValue({
      user: { _id: "user-me" } as unknown as User,
      token: "xyz",
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      isAuthenticated: true,
    });

    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    mockDisconnect = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        (global as unknown as { triggerIntersection: (entries: IntersectionObserverEntry[]) => void }).triggerIntersection = callback;
      }
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = mockDisconnect;
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("sets up intersection observer and returns callback ref", () => {
    mockMessage("msg-1");
    const { result } = renderHook(() => useReadReceipts("case-123"));

    expect(result.current.messageRef).toBeTypeOf("function");
  });

  it("observes unread, not-own messages", () => {
    mockMessage("msg-1");
    const { result } = renderHook(() => useReadReceipts("case-123"));

    const node = document.createElement("div");
    node.setAttribute("data-message-id", "msg-1");
    node.setAttribute("data-unread", "true");
    node.setAttribute("data-own", "false");

    act(() => {
      result.current.messageRef(node as unknown as HTMLDivElement);
    });

    expect(mockObserve).toHaveBeenCalledWith(node);
  });

  it("does not observe own messages", () => {
    mockMessage("msg-1", true);
    const { result } = renderHook(() => useReadReceipts("case-123"));

    const node = document.createElement("div");
    node.setAttribute("data-message-id", "msg-1");
    node.setAttribute("data-unread", "true");
    node.setAttribute("data-own", "true");

    act(() => {
      result.current.messageRef(node as unknown as HTMLDivElement);
    });

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it("emits mark_read batched when intersecting target", () => {
    mockMessage("msg-1");
    renderHook(() => useReadReceipts("case-123"));

    const node1 = document.createElement("div");
    node1.setAttribute("data-message-id", "msg-1");
    const node2 = document.createElement("div");
    node2.setAttribute("data-message-id", "msg-2");

    act(() => {
      (global as unknown as { triggerIntersection: (entries: Partial<IntersectionObserverEntry>[]) => void }).triggerIntersection([
        { isIntersecting: true, target: node1 } as IntersectionObserverEntry,
        { isIntersecting: true, target: node2 } as IntersectionObserverEntry,
      ]);
    });

    expect(mockUnobserve).toHaveBeenCalledTimes(2);
    expect(mockSocketEmit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockSocketEmit).toHaveBeenCalledWith("mark_read", {
      caseId: "case-123",
      messageIds: ["msg-1", "msg-2"],
    });
  });
});
