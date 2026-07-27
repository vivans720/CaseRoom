import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import App from "./App"

// Mock the AuthContext to control auth state
const mockUseAuth = vi.fn()

vi.mock("./hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock page components to keep tests focused on routing
vi.mock("./pages/LoginPage", () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}))

vi.mock("./pages/RegisterPage", () => ({
  RegisterPage: () => <div data-testid="register-page">Register Page</div>,
}))

vi.mock("./pages/DashboardPage", () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard</div>,
}))

const renderApp = (initialPath = "/") => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

describe("App routing", () => {
  it("renders login page at /login", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null,
    })

    renderApp("/login")

    expect(screen.getByTestId("login-page")).toBeInTheDocument()
  })

  it("renders register page at /register", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null,
    })

    renderApp("/register")

    expect(screen.getByTestId("register-page")).toBeInTheDocument()
  })

  it("redirects unauthenticated users from / to login", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null,
    })

    renderApp("/")

    // ProtectedRoute redirects to /login, which renders LoginPage
    expect(screen.getByTestId("login-page")).toBeInTheDocument()
  })

  it("renders dashboard for authenticated users at /", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { _id: "u1", name: "Test User" },
      token: "jwt",
    })

    renderApp("/")

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument()
  })

  it("redirects unknown routes to /", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { _id: "u1", name: "Test User" },
      token: "jwt",
    })

    renderApp("/nonexistent")

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument()
  })
})
