import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

import { RegisterForm } from "./RegisterForm"
import * as authService from "../../services/authService"

vi.mock("../../services/authService", async (importOriginal) => {
  const actual = await importOriginal<typeof authService>()
  return {
    ...actual,
    sendRegisterOtp: vi.fn(),
  }
})

const mockRegister = vi.fn()

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    register: mockRegister,
    login: vi.fn(),
    verifyLoginOtp: vi.fn(),
    isAuthenticated: false,
    isLoading: false,
    user: null,
    token: null,
    logout: vi.fn(),
    changePassword: vi.fn(),
  }),
}))

const mockedSendRegisterOtp = vi.mocked(authService.sendRegisterOtp)

const renderRegisterForm = () => {
  const user = userEvent.setup()

  render(
    <MemoryRouter>
      <RegisterForm />
    </MemoryRouter>,
  )

  return { user }
}

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/employee id/i), "EMP001")
  await user.type(screen.getByLabelText(/full name/i), "John Doe")
  await user.type(screen.getByLabelText(/email/i), "john@test.com")
  await user.type(screen.getByLabelText(/phone/i), "1234567890")
  await user.type(screen.getByLabelText("Password"), "Password1")
  await user.type(screen.getByLabelText(/confirm password/i), "Password1")
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("RegisterForm", () => {
  it("renders all six input fields and step-1 submit button", () => {
    renderRegisterForm()

    expect(screen.getByLabelText(/employee id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    // Step 1 button triggers OTP send
    expect(
      screen.getByRole("button", { name: /continue to verification/i }),
    ).toBeInTheDocument()
  })

  it("shows error for name shorter than 2 characters", async () => {
    const { user } = renderRegisterForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText(/full name/i), "A")
    await user.click(
      screen.getByRole("button", { name: /continue to verification/i }),
    )

    expect(
      screen.getByText(/min 2 chars/i),
    ).toBeInTheDocument()
    expect(mockedSendRegisterOtp).not.toHaveBeenCalled()
  })

  it("shows error for invalid email format", async () => {
    const { user } = renderRegisterForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText(/full name/i), "John Doe")
    await user.type(screen.getByLabelText(/email/i), "not-an-email")
    await user.click(
      screen.getByRole("button", { name: /continue to verification/i }),
    )

    expect(
      screen.getByText(/invalid email format/i),
    ).toBeInTheDocument()
  })

  it("shows error for invalid phone format", async () => {
    const { user } = renderRegisterForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText(/full name/i), "John Doe")
    await user.type(screen.getByLabelText(/email/i), "john@test.com")
    await user.type(screen.getByLabelText(/phone/i), "123")
    await user.click(
      screen.getByRole("button", { name: /continue to verification/i }),
    )

    expect(
      screen.getByText(/10 to 15 digits/i),
    ).toBeInTheDocument()
  })

  it("shows error for weak password", async () => {
    const { user } = renderRegisterForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText(/full name/i), "John Doe")
    await user.type(screen.getByLabelText(/email/i), "john@test.com")
    await user.type(screen.getByLabelText(/phone/i), "1234567890")
    await user.type(screen.getByLabelText("Password"), "weak")
    await user.click(
      screen.getByRole("button", { name: /continue to verification/i }),
    )

    expect(
      screen.getByText(/min 8 chars/i),
    ).toBeInTheDocument()
  })

  it("shows error when passwords do not match", async () => {
    const { user } = renderRegisterForm()

    await user.type(screen.getByLabelText(/employee id/i), "EMP001")
    await user.type(screen.getByLabelText(/full name/i), "John Doe")
    await user.type(screen.getByLabelText(/email/i), "john@test.com")
    await user.type(screen.getByLabelText(/phone/i), "1234567890")
    await user.type(screen.getByLabelText("Password"), "Password1")
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "Different1",
    )
    await user.click(
      screen.getByRole("button", { name: /continue to verification/i }),
    )

    expect(screen.getByText(/passwords mismatch/i)).toBeInTheDocument()
  })

  it("calls sendRegisterOtp with correct data on valid step-1 submit", async () => {
    mockedSendRegisterOtp.mockResolvedValueOnce("OTP sent")
    const { user } = renderRegisterForm()

    await fillValidForm(user)
    await user.click(
      screen.getByRole("button", { name: /continue to verification/i }),
    )

    await waitFor(() => {
      expect(mockedSendRegisterOtp).toHaveBeenCalledWith({
        employeeId: "EMP001",
        name: "John Doe",
        email: "john@test.com",
        phone: "1234567890",
        password: "Password1",
      })
    })
  })

  it("displays server error message on API failure in step 1", async () => {
    mockedSendRegisterOtp.mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          message: "User with this Employee ID already exists",
        },
      },
    })
    const { user } = renderRegisterForm()

    await fillValidForm(user)
    await user.click(
      screen.getByRole("button", { name: /continue to verification/i }),
    )

    expect(
      await screen.findByText(
        /user with this employee id already exists/i,
      ),
    ).toBeInTheDocument()
  })

  it("toggles password visibility when eye icon is clicked", async () => {
    const { user } = renderRegisterForm()

    const passwordInput = screen.getByLabelText("Password")
    expect(passwordInput).toHaveAttribute("type", "password")

    // Click the first "Show password" button (there are two — one for each
    // password field — but they share visibility state)
    const showButtons = screen.getAllByRole("button", {
      name: /show password/i,
    })
    await user.click(showButtons[0])

    expect(passwordInput).toHaveAttribute("type", "text")
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute(
      "type",
      "text",
    )
  })
})
