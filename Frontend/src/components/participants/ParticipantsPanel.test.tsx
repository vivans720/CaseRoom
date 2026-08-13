import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ParticipantsPanel } from "./ParticipantsPanel"
import * as caseService from "../../services/caseService"
import type { User, Case } from "../../types"

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("../../services/caseService")
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { _id: "user-creator" } }),
}))
vi.mock("../../hooks/usePresence", () => ({
  usePresence: () => ({ onlineUserIds: new Set(["user-1"]), lastSeenUpdates: {} }),
}))
// AddParticipantModal is mocked so we don't need to render full modal portal
vi.mock("./AddParticipantModal", () => ({
  AddParticipantModal: () => null,
}))

const mockedCaseService = vi.mocked(caseService)

// ─── Factories ────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<User> = {}): User => ({
  _id: "user-1",
  employeeId: "EMP001",
  name: "Alice Smith",
  email: "alice@example.com",
  phone: "1234567890",
  lastSeen: null,
  pinnedCases: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
})

const makeCase = (overrides: Partial<Case> = {}): Case => ({
  _id: "case-1",
  title: "Test Case",
  creatorId: "user-creator",
  status: "active",
  participants: ["user-creator"],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ParticipantsPanel — loading state", () => {
  it("renders a loading spinner while fetching", () => {
    // Never resolve — keep loading indefinitely
    mockedCaseService.getCaseById.mockReturnValue(new Promise(() => {}))
    mockedCaseService.getCaseParticipants.mockReturnValue(new Promise(() => {}))

    render(<ParticipantsPanel caseId="case-1" />)

    expect(screen.getByRole("status")).toBeInTheDocument()
  })
})

describe("ParticipantsPanel — loaded state", () => {
  it("renders participant names after data loads", async () => {
    mockedCaseService.getCaseById.mockResolvedValue(makeCase())
    mockedCaseService.getCaseParticipants.mockResolvedValue([
      makeUser({ _id: "user-1", name: "Alice Smith" }),
      makeUser({ _id: "user-2", name: "Bob Jones", employeeId: "EMP002" }),
    ])

    render(<ParticipantsPanel caseId="case-1" />)

    await waitFor(() =>
      expect(screen.getByText("Alice Smith")).toBeInTheDocument(),
    )
    expect(screen.getByText("Bob Jones")).toBeInTheDocument()
  })

  it("shows participant count in the header", async () => {
    mockedCaseService.getCaseById.mockResolvedValue(makeCase())
    mockedCaseService.getCaseParticipants.mockResolvedValue([
      makeUser({ _id: "user-1" }),
      makeUser({ _id: "user-2" }),
    ])

    render(<ParticipantsPanel caseId="case-1" />)

    await waitFor(() =>
      expect(screen.getByText("(2)")).toBeInTheDocument(),
    )
  })

  it("shows empty state when participant list is empty", async () => {
    mockedCaseService.getCaseById.mockResolvedValue(makeCase())
    mockedCaseService.getCaseParticipants.mockResolvedValue([])

    render(<ParticipantsPanel caseId="case-1" />)

    await waitFor(() =>
      expect(screen.getByText("No participants")).toBeInTheDocument(),
    )
  })

  it("shows error message when fetch fails", async () => {
    mockedCaseService.getCaseById.mockRejectedValue(new Error("Network error"))
    mockedCaseService.getCaseParticipants.mockRejectedValue(
      new Error("Network error"),
    )

    render(<ParticipantsPanel caseId="case-1" />)

    await waitFor(() =>
      expect(
        screen.getByText("Failed to load participants. Please try again."),
      ).toBeInTheDocument(),
    )
  })
})

describe("ParticipantsPanel — creator controls", () => {
  it("shows Add button and Remove buttons when current user is the creator", async () => {
    mockedCaseService.getCaseById.mockResolvedValue(
      makeCase({ creatorId: "user-creator" }),
    )
    mockedCaseService.getCaseParticipants.mockResolvedValue([
      makeUser({ _id: "user-1", name: "Alice Smith" }),
      makeUser({ _id: "user-creator", name: "Creator User", employeeId: "EMP-CREATOR" }),
    ])

    render(<ParticipantsPanel caseId="case-1" />)

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /add participant/i })).toBeInTheDocument(),
    )
    // Open context menu for Alice
    await userEvent.click(screen.getByRole("button", { name: /manage participant/i }))
    // Remove shows for non-creator participant (Alice)
    expect(screen.getByRole("button", { name: /remove user/i })).toBeInTheDocument()
  })

  it("does not show Add or Remove buttons when current user is not the creator", async () => {
    mockedCaseService.getCaseById.mockResolvedValue(
      makeCase({ creatorId: "user-other" }),
    )
    mockedCaseService.getCaseParticipants.mockResolvedValue([
      makeUser({ _id: "user-1", name: "Alice Smith" }),
    ])

    render(<ParticipantsPanel caseId="case-1" />)

    await waitFor(() =>
      expect(screen.getByText("Alice Smith")).toBeInTheDocument(),
    )

    expect(
      screen.queryByRole("button", { name: /add participant/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /remove/i }),
    ).not.toBeInTheDocument()
  })
})

describe("ParticipantsPanel — remove action", () => {
  it("calls updateParticipants with 'remove' action and re-fetches on confirm", async () => {
    mockedCaseService.getCaseById.mockResolvedValue(
      makeCase({ creatorId: "user-creator" }),
    )
    mockedCaseService.getCaseParticipants.mockResolvedValue([
      makeUser({ _id: "user-1", name: "Alice Smith" }),
    ])
    mockedCaseService.updateParticipants.mockResolvedValue(undefined)

    render(<ParticipantsPanel caseId="case-1" />)

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /manage participant/i })).toBeInTheDocument(),
    )

    await userEvent.click(
      screen.getByRole("button", { name: /manage participant/i }),
    )

    await userEvent.click(
      screen.getByRole("button", { name: /remove user/i }),
    )

    await waitFor(() =>
      expect(mockedCaseService.updateParticipants).toHaveBeenCalledWith(
        "case-1",
        "remove",
        "user-1",
      ),
    )

    // Refetch is called after remove
    expect(mockedCaseService.getCaseParticipants).toHaveBeenCalledTimes(2)
  })
})
