import { renderHook } from "@testing-library/react";
import { useSocket } from "./useSocket";
import { useSocketContext } from "../contexts/SocketContext";
import { vi, Mock } from "vitest";
import type { Socket } from "socket.io-client";

vi.mock("../contexts/SocketContext");

describe("useSocket", () => {
  it("calls useSocketContext and returns its value", () => {
    const mockValue = {
      socket: { id: "1" } as unknown as Socket,
      isConnected: true,
    };
    (useSocketContext as Mock).mockReturnValue(mockValue);

    const { result } = renderHook(() => useSocket());

    expect(result.current).toBe(mockValue);
    expect(useSocketContext).toHaveBeenCalled();
  });
});
