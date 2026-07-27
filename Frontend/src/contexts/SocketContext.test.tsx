import { render, act } from "@testing-library/react";
import { SocketProvider, useSocketContext } from "./SocketContext";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import { vi, Mock } from "vitest";
import { JSX } from "react";

vi.mock("socket.io-client");
vi.mock("../hooks/useAuth");

const TestComponent = (): JSX.Element => {
  const { socket, isConnected } = useSocketContext();
  return (
    <div>
      <div data-testid="socket">{socket ? "exists" : "null"}</div>
      <div data-testid="isConnected">{isConnected.toString()}</div>
    </div>
  );
};

describe("SocketContext", () => {
  type SocketListener = (...args: unknown[]) => void;

  let mockSocket: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
    };
    (io as Mock).mockReturnValue(mockSocket);
  });

  it("does not initialize socket if not authenticated", () => {
    (useAuth as Mock).mockReturnValue({ isAuthenticated: false, token: null });

    const { getByTestId } = render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>,
    );

    expect(getByTestId("socket").textContent).toBe("null");
    expect(io).not.toHaveBeenCalled();
  });

  it("initializes socket if authenticated", async () => {
    (useAuth as Mock).mockReturnValue({
      isAuthenticated: true,
      token: "test-token",
    });

    const { getByTestId } = render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>,
    );

    expect(getByTestId("socket").textContent).toBe("exists");
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: "test-token" },
      }),
    );
  });

  it("updates isConnected when socket emits connect/disconnect", async () => {
    const listeners: Record<string, SocketListener> = {};
    mockSocket.on.mockImplementation((event: string, cb: SocketListener) => {
      listeners[event] = cb;
    });
    (useAuth as Mock).mockReturnValue({
      isAuthenticated: true,
      token: "test-token",
    });

    const { getByTestId } = render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>,
    );

    expect(getByTestId("isConnected").textContent).toBe("false");

    act(() => {
      listeners["connect"]();
    });
    expect(getByTestId("isConnected").textContent).toBe("true");

    act(() => {
      listeners["disconnect"]();
    });
    expect(getByTestId("isConnected").textContent).toBe("false");
  });

  it("disconnects socket on unmount", () => {
    (useAuth as Mock).mockReturnValue({
      isAuthenticated: true,
      token: "test-token",
    });

    const { unmount } = render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>,
    );

    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
