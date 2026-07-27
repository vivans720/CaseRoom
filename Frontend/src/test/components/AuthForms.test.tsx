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

    fireEvent.click(screen.getByText(/Next: Verify Email/i));

    const resendBtn = await screen.findByText("Resend Code");
    
    // Enable fake timers for cooldown test
    vi.useFakeTimers();

    // Click Resend inside act to flush async state updates
    await act(async () => {
      fireEvent.click(resendBtn);
    });

    expect(authService.resendOtp).toHaveBeenCalled();

    // Check cooldown
    expect(screen.getByText(/Resend code in 60s/i)).toBeInTheDocument();

    for (let i = 0; i < 60; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByText("Resend Code")).toBeInTheDocument();
    
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
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    const resendBtn = await screen.findByText("Resend Code");
    
    // Enable fake timers
    vi.useFakeTimers();

    // Click Resend inside act
    await act(async () => {
      fireEvent.click(resendBtn);
    });

    expect(authService.resendOtp).toHaveBeenCalled();

    expect(screen.getByText(/Resend code in 60s/i)).toBeInTheDocument();

    for (let i = 0; i < 60; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByText("Resend Code")).toBeInTheDocument();
    
    vi.useRealTimers();
  });
});
