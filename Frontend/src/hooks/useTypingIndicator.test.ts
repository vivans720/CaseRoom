import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTypingIndicator } from "./useTypingIndicator"

// ---- Socket mock setup ----

const mockEmit = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()

vi.mock("./useSocket", () => ({
  useSocket: () => ({
    socket: { emit: mockEmit, on: mockOn, off: mockOff },
    isConnected: true,
  }),
}))

// Capture a specific registered listener for later invocation in tests
const getListener = (event: string) => {
  const call = mockOn.mock.calls.find(([e]) => e === event)
  return call?.[1] as ((...args: unknown[]) => void) | undefined
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("useTypingIndicator — notifyTyping emits", () => {
  it("emits typing_start on the first notifyTyping call", () => {
    const { result } = renderHook(() => useTypingIndicator("case-1"))

    act(() => {
      result.current.notifyTyping()
    })

    expect(mockEmit).toHaveBeenCalledWith("typing_start", { caseId: "case-1" })
  })

  it("emits typing_start only once for rapid subsequent calls", () => {
    const { result } = renderHook(() => useTypingIndicator("case-1"))

    act(() => {
      result.current.notifyTyping()
      result.current.notifyTyping()
      result.current.notifyTyping()
    })

    const startCalls = mockEmit.mock.calls.filter(([e]) => e === "typing_start")
    expect(startCalls).toHaveLength(1)
  })

  it("emits typing_stop after 2s of no notifyTyping calls", () => {
    const { result } = renderHook(() => useTypingIndicator("case-1"))

    act(() => {
      result.current.notifyTyping()
    })

    expect(mockEmit).not.toHaveBeenCalledWith("typing_stop", expect.anything())

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockEmit).toHaveBeenCalledWith("typing_stop", { caseId: "case-1" })
  })

  it("resets the stop timer when notifyTyping is called again before 2s", () => {
    const { result } = renderHook(() => useTypingIndicator("case-1"))

    act(() => {
      result.current.notifyTyping()
    })

    act(() => {
      vi.advanceTimersByTime(1500)
      result.current.notifyTyping() // resets debounce
    })

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    // 1500 + reset + 1500 = 3000ms total but stop should come 2s after LAST call
    expect(mockEmit).not.toHaveBeenCalledWith("typing_stop", expect.anything())

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockEmit).toHaveBeenCalledWith("typing_stop", { caseId: "case-1" })
  })
})

describe("useTypingIndicator — receiving typing_start", () => {
  it("adds user to typingUserNames on typing_start event", () => {
    const { result } = renderHook(() => useTypingIndicator("case-1"))

    act(() => {
      getListener("typing_start")?.({ userId: "user-2", name: "Alice" })
    })

    expect(result.current.typingUserNames).toContain("Alice")
  })
})

describe("useTypingIndicator — receiving typing_stop", () => {
  it("removes user from typingUserNames on typing_stop event", () => {
    const { result } = renderHook(() => useTypingIndicator("case-1"))

    act(() => {
      getListener("typing_start")?.({ userId: "user-2", name: "Alice" })
    })

    act(() => {
      getListener("typing_stop")?.({ userId: "user-2" })
    })

    expect(result.current.typingUserNames).not.toContain("Alice")
  })
})

describe("useTypingIndicator — auto-clear", () => {
  it("removes user from typingUserNames after 3s auto-clear timeout", () => {
    const { result } = renderHook(() => useTypingIndicator("case-1"))

    act(() => {
      getListener("typing_start")?.({ userId: "user-2", name: "Alice" })
    })

    expect(result.current.typingUserNames).toContain("Alice")

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.typingUserNames).not.toContain("Alice")
  })
})

describe("useTypingIndicator — cleanup", () => {
  it("removes socket listeners on unmount", () => {
    const { unmount } = renderHook(() => useTypingIndicator("case-1"))

    unmount()

    expect(mockOff).toHaveBeenCalledWith("typing_start", expect.any(Function))
    expect(mockOff).toHaveBeenCalledWith("typing_stop", expect.any(Function))
  })
})
