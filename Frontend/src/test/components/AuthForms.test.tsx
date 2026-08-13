import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { RegisterForm } from "../../components/auth/RegisterForm";
import { LoginForm } from "../../components/auth/LoginForm";
import * as authService from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../services/authService", () => ({
  sendRegisterOtp: vi.fn().mockResolvedValue("OK"),
  resendOtp: vi.fn().mockResolvedValue("OK"),
  extractErrorMessage: vi.fn(() => "Error"),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("AuthForms Resend OTP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RegisterForm handles OTP resend and cooldown", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAuth).mockReturnValue({ register: vi.fn() } as any);

    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Employee ID"), { target: { value: "EMP001" } });
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "1234567890" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Password123" } });

    vi.useFakeTimers();

    await act(async () => {
      fireEvent.click(screen.getByText(/Continue to Verification/i));
    });

    // Check initial cooldown text
    expect(screen.getByText(/Resend code in 01:00/i)).toBeInTheDocument();

    // Advance 65s to enable the button and clear cooldown
    for (let i = 0; i < 65; i++) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }

    // Now button should say 'Resend code' and be enabled
    const enabledBtn = screen.getByText(/Resend code/i, { selector: 'button:not([disabled])' });

    // Click Resend inside act to flush async state updates
    await act(async () => {
      fireEvent.click(enabledBtn);
    });

    expect(authService.resendOtp).toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it("LoginForm handles OTP resend and cooldown", async () => {
    vi.mocked(useAuth).mockReturnValue({ 
      login: vi.fn().mockResolvedValue({
        requireOtp: true,
        tempToken: "token",
        email: "login@test.com"
      }) 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Employee ID"), { target: { value: "EMP001" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
    vi.useFakeTimers();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
    });

    // Check initial cooldown text
    expect(screen.getByText(/Resend code in 01:00/i)).toBeInTheDocument();

    // Advance 65s to enable the button and clear cooldown
    for (let i = 0; i < 65; i++) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }

    // Now button should say 'Resend code' and be enabled
    const enabledBtn = screen.getByText(/Resend code/i, { selector: 'button:not([disabled])' });

    // Click Resend inside act
    await act(async () => {
      fireEvent.click(enabledBtn);
    });

    expect(authService.resendOtp).toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});
