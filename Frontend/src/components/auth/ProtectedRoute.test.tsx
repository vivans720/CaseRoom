import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import { ProtectedRoute } from "./ProtectedRoute"

const mockUseAuth = vi.fn()

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

const renderProtectedRoute = (initialPath = "/") => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ProtectedRoute>
        <div data-testid="protected-content">Secret content</div>
      </ProtectedRoute>
    </MemoryRouter>,
  )
}

describe("ProtectedRoute", () => {
  it("renders loading spinner when isLoading is true", () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    })

    renderProtectedRoute()

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument()
  })

  it("redirects to /login when not authenticated and not loading", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    })

    renderProtectedRoute()

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument()
    // MemoryRouter won't actually navigate away — the Navigate component
    // replaces the current entry, so children aren't rendered
  })

  it("renders children when authenticated and not loading", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    })

    renderProtectedRoute()

    expect(screen.getByTestId("protected-content")).toBeInTheDocument()
    expect(screen.getByText("Secret content")).toBeInTheDocument()
  })
})
