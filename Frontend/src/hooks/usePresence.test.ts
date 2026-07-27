import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePresence } from "./usePresence"

// ---- Minimal EventEmitter-style socket mock ----
// Avoids closing over large mock.calls arrays that cause OOM

type Listener = (...args: unknown[]) => void

const listeners: Record<string, Listener[]> = {}

const mockSocket = {
  on: (event: string, fn: Listener) => {
    listeners[event] = listeners[event] ?? []
    listeners[event].push(fn)
  },
  off: (event: string, fn: Listener) => {
    listeners[event] = (listeners[event] ?? []).filter((l) => l !== fn)
  },
  emit: vi.fn(),
}

vi.mock("./useSocket", () => ({
  useSocket: () => ({
    socket: mockSocket,
    isConnected: true,
  }),
}))

const fire = (event: string, payload: unknown) => {
  ;(listeners[event] ?? []).forEach((fn) => fn(payload))
}

beforeEach(() => {
  // Clear listeners between tests
  Object.keys(listeners).forEach((k) => delete listeners[k])
})

describe("usePresence — online_users event", () => {
  it("populates onlineUserIds from the online_users event matching caseId", () => {
    const { result } = renderHook(() => usePresence("case-1"))

    act(() => {
      fire("online_users", { caseId: "case-1", onlineUsers: ["user-1", "user-2"] })
    })

    expect(result.current.onlineUserIds.has("user-1")).toBe(true)
    expect(result.current.onlineUserIds.has("user-2")).toBe(true)
    expect(result.current.onlineUserIds.size).toBe(2)
  })

  it("ignores online_users events for a different caseId", () => {
    const { result } = renderHook(() => usePresence("case-1"))

    act(() => {
      fire("online_users", { caseId: "case-2", onlineUsers: ["user-3"] })
    })

    expect(result.current.onlineUserIds.size).toBe(0)
  })
})

describe("usePresence — user_online event", () => {
  it("adds a user to onlineUserIds", () => {
    const { result } = renderHook(() => usePresence("case-1"))

    act(() => {
      fire("user_online", { userId: "user-1", caseId: "case-1", name: "Alice" })
    })

    expect(result.current.onlineUserIds.has("user-1")).toBe(true)
  })

  it("ignores user_online events for a different caseId", () => {
    const { result } = renderHook(() => usePresence("case-1"))

    act(() => {
      fire("user_online", { userId: "user-1", caseId: "case-2", name: "Alice" })
    })

    expect(result.current.onlineUserIds.size).toBe(0)
  })
})

describe("usePresence — user_offline event", () => {
  it("removes a user from onlineUserIds", () => {
    const { result } = renderHook(() => usePresence("case-1"))

    act(() => {
      fire("online_users", { caseId: "case-1", onlineUsers: ["user-1", "user-2"] })
    })

    act(() => {
      fire("user_offline", { userId: "user-1", caseId: "case-1", lastSeen: new Date().toISOString() })
    })

    expect(result.current.onlineUserIds.has("user-1")).toBe(false)
    expect(result.current.onlineUserIds.has("user-2")).toBe(true)
  })

  it("ignores user_offline events for a different caseId", () => {
    const { result } = renderHook(() => usePresence("case-1"))

    act(() => {
      fire("online_users", { caseId: "case-1", onlineUsers: ["user-1"] })
    })

    act(() => {
      fire("user_offline", { userId: "user-1", caseId: "case-2", lastSeen: new Date().toISOString() })
    })

    expect(result.current.onlineUserIds.has("user-1")).toBe(true)
  })
})

describe("usePresence — cleanup", () => {
  it("removes listeners on unmount", () => {
    const { unmount } = renderHook(() => usePresence("case-1"))

    unmount()

    // All listener arrays should be empty after cleanup
    expect(listeners["online_users"] ?? []).toHaveLength(0)
    expect(listeners["user_online"] ?? []).toHaveLength(0)
    expect(listeners["user_offline"] ?? []).toHaveLength(0)
  })

  it("resets onlineUserIds when caseId changes", () => {
    const { result, rerender } = renderHook(
      ({ caseId }: { caseId: string }) => usePresence(caseId),
      { initialProps: { caseId: "case-1" } },
    )

    act(() => {
      fire("online_users", { caseId: "case-1", onlineUsers: ["user-1"] })
    })

    expect(result.current.onlineUserIds.size).toBe(1)

    rerender({ caseId: "case-2" })

    expect(result.current.onlineUserIds.size).toBe(0)
  })
})
