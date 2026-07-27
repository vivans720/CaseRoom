import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

import { LoginForm } from "./LoginForm"

// Mock useAuth
const mockLogin = vi.fn()

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    isLoading: false,
    user: null,
    token: null,
    register: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
  }),
}))

const renderLoginForm = () => {
  const user = userEvent.setup()

  render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  )

  return { user }
}

describe("LoginForm", () => {
  it("renders employee ID and password inputs and submit button", () => {
    renderLoginForm()

    expect(screen.getByLabelText(/employee id/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument()
  })

  it("renders a remember me checkbox", () => {
    renderLoginForm()

    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
  })

  it("shows validation error when employee ID is empty on submit", async () => {
    const { user } = renderLoginForm()

    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(
      screen.getByText(/employee id is required/i),
    ).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it("shows validation error when password is empty on submit", async () => {
    const { user } = renderLoginForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it("calls login with correct args on valid submit", async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    const { user } = renderLoginForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText("Password"), "Password1")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(mockLogin).toHaveBeenCalledWith("EMP001", "Password1", false)
  })

  it("passes rememberMe=true when checkbox is checked", async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    const { user } = renderLoginForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText("Password"), "Password1")
    await user.click(screen.getByLabelText(/remember me/i))
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(mockLogin).toHaveBeenCalledWith("EMP001", "Password1", true)
  })

  it("displays server error message on API failure", async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        data: { success: false, message: "Invalid Employee ID or Password" },
      },
    })
    const { user } = renderLoginForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText("Password"), "WrongPass1")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(
      await screen.findByText(/invalid employee id or password/i),
    ).toBeInTheDocument()
  })

  it("disables submit button while submitting", async () => {
    // Make login hang to test submitting state
    let resolveLogin: (() => void) | undefined
    mockLogin.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveLogin = resolve }),
    )
    const { user } = renderLoginForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText("Password"), "Password1")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled()

    // Clean up
    resolveLogin?.()
  })

  it("toggles password visibility when eye icon is clicked", async () => {
    const { user } = renderLoginForm()

    const passwordInput = screen.getByLabelText("Password")
    expect(passwordInput).toHaveAttribute("type", "password")

    await user.click(screen.getByRole("button", { name: /show password/i }))
    expect(passwordInput).toHaveAttribute("type", "text")

    await user.click(screen.getByRole("button", { name: /hide password/i }))
    expect(passwordInput).toHaveAttribute("type", "password")
  })
})
