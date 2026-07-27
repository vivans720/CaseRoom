import { renderHook } from "@testing-library/react";
import { useCaseSocket } from "./useCaseSocket";
import { useSocket } from "./useSocket";
import { vi, Mock } from "vitest";

vi.mock("./useSocket");

type SocketListener = (...args: unknown[]) => void;

describe("useCaseSocket", () => {
  let mockSocket: {
    emit: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  it("does nothing if caseId is undefined", () => {
    (useSocket as Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
    });

    renderHook(() => useCaseSocket(undefined));

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("does nothing if socket is not connected", () => {
    (useSocket as Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: false,
    });

    renderHook(() => useCaseSocket("case-1"));

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("emits join_case and get_online_users and registers listener on mount", () => {
    (useSocket as Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
    });

    renderHook(() => useCaseSocket("case-1"));

    expect(mockSocket.emit).toHaveBeenCalledWith("join_case", {
      caseId: "case-1",
    });
    expect(mockSocket.emit).toHaveBeenCalledWith("get_online_users", {
      caseId: "case-1",
    });
    expect(mockSocket.on).toHaveBeenCalledWith(
      "message_read",
      expect.any(Function),
    );
  });

  it("emits leave_case and unregisters listener on unmount", () => {
    (useSocket as Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
    });

    const { unmount } = renderHook(() => useCaseSocket("case-1"));

    unmount();
    expect(mockSocket.emit).toHaveBeenCalledWith("leave_case", {
      caseId: "case-1",
    });
    expect(mockSocket.off).toHaveBeenCalledWith(
      "message_read",
      expect.any(Function),
    );
  });

  it("re-registers if caseId changes", () => {
    (useSocket as Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
    });

    const { rerender } = renderHook(({ caseId }) => useCaseSocket(caseId), {
      initialProps: { caseId: "case-1" },
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("join_case", {
      caseId: "case-1",
    });

    rerender({ caseId: "case-2" });

    expect(mockSocket.emit).toHaveBeenCalledWith("leave_case", {
      caseId: "case-1",
    });
    expect(mockSocket.emit).toHaveBeenCalledWith("join_case", {
      caseId: "case-2",
    });
  });

  it("calls onMessageRead callback when socket emits message_read", () => {
    const onMessageRead = vi.fn();
    let handleMessageRead: SocketListener = () => {};
    mockSocket.on.mockImplementation((event: string, cb: SocketListener) => {
      if (event === "message_read") handleMessageRead = cb;
    });
    (useSocket as Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
    });

    renderHook(() => useCaseSocket("case-1", { onMessageRead }));

    const event = { caseId: "case-1", messageId: "m1", readBy: [] };
    handleMessageRead(event);

    expect(onMessageRead).toHaveBeenCalledWith(event);
  });
});
