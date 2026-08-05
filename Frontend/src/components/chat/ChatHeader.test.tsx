import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatHeader } from "./ChatHeader"
import * as caseService from "../../services/caseService"
import { useSocket } from "../../hooks/useSocket"
import { vi, Mock } from "vitest"
import { MemoryRouter } from "react-router-dom"

vi.mock("../../services/caseService")
vi.mock("../../hooks/useSocket")
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { _id: "u1", name: "Alice" } }),
}))
vi.mock("../notifications/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))
vi.mock("../meeting/JoinMeetingButton", () => ({
  JoinMeetingButton: () => <div data-testid="join-meeting-btn" />,
}))

describe("ChatHeader", () => {
  const mockCaseId = "case-123"
  const mockCase = {
    _id: mockCaseId,
    title: "Test Case",
    description: "Test description",
    status: "active",
  }
  const mockParticipants = [
    { _id: "u1", name: "Alice" },
    { _id: "u2", name: "Bob" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(caseService.getCaseById as Mock).mockResolvedValue(mockCase)
    ;(caseService.getCaseParticipants as Mock).mockResolvedValue(mockParticipants)
    ;(useSocket as Mock).mockReturnValue({
      socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
      isConnected: true,
    })
  })

  it("renders loading state initially", () => {
    render(
      <MemoryRouter>
        <ChatHeader 
          caseId={mockCaseId} 
          activePanel="participants" 
          onTogglePanel={vi.fn()} 
          onlineUserIds={new Set()} 
        />
      </MemoryRouter>
    )
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("renders case data after loading", async () => {
    render(
      <MemoryRouter>
        <ChatHeader 
          caseId={mockCaseId} 
          activePanel="participants" 
          onTogglePanel={vi.fn()} 
          onlineUserIds={new Set(["u1"])} 
        />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText("Test Case")).toBeInTheDocument())
    expect(screen.getByText("Test description")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument() // participant count
  })

  it("calls onTogglePanel when panel buttons are clicked", async () => {
    const user = userEvent.setup()
    const onTogglePanel = vi.fn()
    
    render(
      <MemoryRouter>
        <ChatHeader 
          caseId={mockCaseId} 
          activePanel="participants" 
          onTogglePanel={onTogglePanel} 
          onlineUserIds={new Set()} 
        />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText("Test Case")).toBeInTheDocument())

    await user.click(screen.getByLabelText("View participants list"))
    expect(onTogglePanel).toHaveBeenCalledWith("participants")
    onTogglePanel.mockClear()

    await user.click(screen.getByLabelText("Files & Media"))
    expect(onTogglePanel).toHaveBeenCalledWith("media")
    onTogglePanel.mockClear()

    await user.click(screen.getByLabelText("Search messages"))
    expect(onTogglePanel).toHaveBeenCalledWith("search")

    await user.click(screen.getByLabelText("Case settings"))
    expect(onTogglePanel).toHaveBeenCalledWith("settings")
  })

  it("renders 'Case not found' if fetching fails", async () => {
    ;(caseService.getCaseById as Mock).mockRejectedValue(new Error("Not found"))

    render(
      <MemoryRouter>
        <ChatHeader 
          caseId={mockCaseId} 
          activePanel="participants" 
          onTogglePanel={vi.fn()} 
          onlineUserIds={new Set()} 
        />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText("Case not found")).toBeInTheDocument())
  })
})
