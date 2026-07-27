import { render, screen, fireEvent } from "@testing-library/react"
import { NotificationBell } from "./NotificationBell"
import { useNotifications } from "../../hooks/useNotifications"
import { vi, Mock } from "vitest"

vi.mock("../../hooks/useNotifications")
vi.mock("./NotificationPanel", () => ({
  NotificationPanel: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="notification-panel" /> : null
  )
}))

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the bell icon and badge when unreadCount > 0", () => {
    ;(useNotifications as Mock).mockReturnValue({ unreadCount: 5 })
    render(<NotificationBell />)
    
    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("does not render badge when unreadCount is 0", () => {
    ;(useNotifications as Mock).mockReturnValue({ unreadCount: 0 })
    render(<NotificationBell />)
    
    expect(screen.queryByText("0")).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("toggles the NotificationPanel when clicked", () => {
    ;(useNotifications as Mock).mockReturnValue({ unreadCount: 0 })
    render(<NotificationBell />)
    
    const bellBtn = screen.getByLabelText(/notifications/i)
    
    // Closed initially
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument()
    
    // Open
    fireEvent.click(bellBtn)
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument()
    
    // Close
    fireEvent.click(bellBtn)
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument()
  })

  it("closes the panel when Escape is pressed", () => {
    ;(useNotifications as Mock).mockReturnValue({ unreadCount: 0 })
    render(<NotificationBell />)
    
    fireEvent.click(screen.getByLabelText(/notifications/i))
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument()
    
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument()
  })

  it("closes the panel when clicking outside", () => {
    ;(useNotifications as Mock).mockReturnValue({ unreadCount: 0 })
    render(<NotificationBell />)
    
    fireEvent.click(screen.getByLabelText(/notifications/i))
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument()
    
    fireEvent.mouseDown(document.body)
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument()
  })
})
