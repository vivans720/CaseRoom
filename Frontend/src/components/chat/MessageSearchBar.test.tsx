import { render, screen, waitFor, fireEvent, act } from "@testing-library/react"
import { MessageSearchBar } from "./MessageSearchBar"
import * as messageService from "../../services/messageService"
import { vi, Mock } from "vitest"

vi.mock("../../services/messageService")

describe("MessageSearchBar", () => {
  const mockMessages = [
    {
      _id: "1",
      content: "Found it",
      senderId: { name: "Alice" },
      createdAt: new Date().toISOString(),
    },
  ]

  const defaultProps = {
    caseId: "c1",
    onClose: vi.fn(),
    onResultClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders search input correctly", () => {
    render(<MessageSearchBar {...defaultProps} />)
    expect(
      screen.getByPlaceholderText(/search words, phrases/i),
    ).toBeInTheDocument()
  })

  it("performs search after debounce when user types", async () => {
    ;(messageService.searchMessages as Mock).mockResolvedValue(mockMessages)
    render(<MessageSearchBar {...defaultProps} />)

    const input = screen.getByPlaceholderText(/search words, phrases/i)
    fireEvent.change(input, { target: { value: "found" } })

    // Move time forward by 400ms (debounce)
    act(() => {
        vi.advanceTimersByTime(400)
    })

    await waitFor(() => expect(screen.getByText("Found it")).toBeInTheDocument())
    expect(screen.getByText("Alice")).toBeInTheDocument()
  })

  it("displays empty state when no results are found", async () => {
    ;(messageService.searchMessages as Mock).mockResolvedValue([])
    render(<MessageSearchBar {...defaultProps} />)

    const input = screen.getByPlaceholderText(/search words, phrases/i)
    fireEvent.change(input, { target: { value: "nothing" } })

    act(() => {
        vi.advanceTimersByTime(400)
    })

    await waitFor(() =>
      expect(screen.getByText(/no matches found/i)).toBeInTheDocument(),
    )
  })

  it("displays error message when search fails", async () => {
    ;(messageService.searchMessages as Mock).mockRejectedValue(new Error("Fail"))
    render(<MessageSearchBar {...defaultProps} />)

    const input = screen.getByPlaceholderText(/search words, phrases/i)
    fireEvent.change(input, { target: { value: "error" } })

    act(() => {
        vi.advanceTimersByTime(400)
    })

    await waitFor(() =>
      expect(screen.getByText("Failed to search messages.")).toBeInTheDocument(),
    )
  })

  it("clears results when query is empty", async () => {
    ;(messageService.searchMessages as Mock).mockResolvedValue(mockMessages)
    render(<MessageSearchBar {...defaultProps} />)

    const input = screen.getByPlaceholderText(/search words, phrases/i)
    fireEvent.change(input, { target: { value: "found" } })
    
    act(() => {
        vi.advanceTimersByTime(400)
    })
    
    await waitFor(() => expect(screen.getByText("Found it")).toBeInTheDocument())

    fireEvent.change(input, { target: { value: "" } })
    expect(screen.queryByText("Found it")).not.toBeInTheDocument()
    expect(
      screen.getByText(/find what you're looking for/i),
    ).toBeInTheDocument()
  })
})
