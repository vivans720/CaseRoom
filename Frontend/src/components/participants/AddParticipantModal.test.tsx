import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddParticipantModal } from "./AddParticipantModal"
import * as userService from "../../services/userService"
import * as caseService from "../../services/caseService"
import type { User } from "../../types"

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("../../services/userService")
vi.mock("../../services/caseService")

// Mock Modal so tests don't depend on createPortal / document.body
vi.mock("../ui/Modal", () => ({
  Modal: ({
    isOpen,
    children,
    title,
  }: {
    isOpen: boolean
    children: React.ReactNode
    title?: string
    onClose: () => void
  }) => {
    if (!isOpen) return null
    return (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    )
  },
}))

const mockedUserService = vi.mocked(userService)
const mockedCaseService = vi.mocked(caseService)

// ─── Factories ────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<User> = {}): User => ({
  _id: "user-2",
  employeeId: "EMP002",
  name: "Bob Jones",
  email: "bob@example.com",
  phone: "9876543210",
  lastSeen: null,
  pinnedCases: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
})

const defaultProps = {
  caseId: "case-1",
  existingParticipantIds: ["user-1"],
  isOpen: true,
  onClose: vi.fn(),
  onAdded: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AddParticipantModal — search", () => {
  it("calls searchUsers with trimmed query and existing IDs after debounce", async () => {
    mockedUserService.searchUsers.mockResolvedValue([makeUser()])

    render(<AddParticipantModal {...defaultProps} />)

    const input = screen.getByRole("textbox", {
      name: /search by name or employee id/i,
    })

    await userEvent.type(input, "Bob")

    // waitFor polls until searchUsers is called (debounce fires within 300ms real time)
    await waitFor(
      () => expect(mockedUserService.searchUsers).toHaveBeenCalledWith("Bob", ["user-1"]),
      { timeout: 2000 },
    )
  })

  it("renders search results after successful query", async () => {
    mockedUserService.searchUsers.mockResolvedValue([makeUser()])

    render(<AddParticipantModal {...defaultProps} />)

    const input = screen.getByRole("textbox", {
      name: /search by name or employee id/i,
    })

    await userEvent.type(input, "Bob")

    await waitFor(
      () => expect(screen.getByTitle("Bob Jones")).toBeInTheDocument(),
      { timeout: 2000 },
    )
  })

  it("shows no results message when search returns empty array", async () => {
    mockedUserService.searchUsers.mockResolvedValue([])

    render(<AddParticipantModal {...defaultProps} />)

    const input = screen.getByRole("textbox", {
      name: /search by name or employee id/i,
    })

    await userEvent.type(input, "xyz")

    await waitFor(
      () => expect(screen.getByText("No users found.")).toBeInTheDocument(),
      { timeout: 2000 },
    )
  })

  it("shows search error when searchUsers throws", async () => {
    mockedUserService.searchUsers.mockRejectedValue(new Error("Network error"))

    render(<AddParticipantModal {...defaultProps} />)

    const input = screen.getByRole("textbox", {
      name: /search by name or employee id/i,
    })

    await userEvent.type(input, "fail")

    await waitFor(
      () =>
        expect(
          screen.getByText("Search failed. Please try again."),
        ).toBeInTheDocument(),
      { timeout: 2000 },
    )
  })

  it("forwards existingParticipantIds as excludeIds", async () => {
    mockedUserService.searchUsers.mockResolvedValue([])

    render(
      <AddParticipantModal
        {...defaultProps}
        existingParticipantIds={["user-1", "user-3"]}
      />,
    )

    const input = screen.getByRole("textbox", {
      name: /search by name or employee id/i,
    })

    await userEvent.type(input, "A")

    await waitFor(
      () =>
        expect(mockedUserService.searchUsers).toHaveBeenCalledWith("A", [
          "user-1",
          "user-3",
        ]),
      { timeout: 2000 },
    )
  })
})

describe("AddParticipantModal — add action", () => {
  it("calls updateParticipants with 'add' action and closes modal on success", async () => {
    mockedUserService.searchUsers.mockResolvedValue([makeUser()])
    mockedCaseService.updateParticipants.mockResolvedValue(undefined)

    const onClose = vi.fn()
    const onAdded = vi.fn()

    render(
      <AddParticipantModal
        {...defaultProps}
        onClose={onClose}
        onAdded={onAdded}
      />,
    )

    const input = screen.getByRole("textbox", {
      name: /search by name or employee id/i,
    })

    await userEvent.type(input, "Bob")

    await waitFor(
      () => expect(screen.getByTitle("Bob Jones")).toBeInTheDocument(),
      { timeout: 2000 },
    )

    await userEvent.click(
      screen.getByRole("button", { name: /add bob jones/i }),
    )

    await waitFor(() =>
      expect(mockedCaseService.updateParticipants).toHaveBeenCalledWith(
        "case-1",
        "add",
        "user-2",
        "Editor",
      ),
    )

    expect(onAdded).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it("shows add error when updateParticipants fails", async () => {
    mockedUserService.searchUsers.mockResolvedValue([makeUser()])
    mockedCaseService.updateParticipants.mockRejectedValue(
      new Error("Server error"),
    )

    render(<AddParticipantModal {...defaultProps} />)

    const input = screen.getByRole("textbox", {
      name: /search by name or employee id/i,
    })

    await userEvent.type(input, "Bob")

    await waitFor(
      () => expect(screen.getByTitle("Bob Jones")).toBeInTheDocument(),
      { timeout: 2000 },
    )

    await userEvent.click(
      screen.getByRole("button", { name: /add bob jones/i }),
    )

    await waitFor(() =>
      expect(
        screen.getByText("Failed to add participant. Please try again."),
      ).toBeInTheDocument(),
    )
  })
})

describe("AddParticipantModal — cancel", () => {
  it("calls onClose when Cancel button is clicked", async () => {
    const onClose = vi.fn()

    render(<AddParticipantModal {...defaultProps} onClose={onClose} />)

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }))

    expect(onClose).toHaveBeenCalled()
  })
})

describe("AddParticipantModal — closed state", () => {
  it("renders nothing when isOpen is false", () => {
    render(<AddParticipantModal {...defaultProps} isOpen={false} />)

    expect(
      screen.queryByRole("textbox", { name: /search by name or employee id/i }),
    ).not.toBeInTheDocument()
  })
})
