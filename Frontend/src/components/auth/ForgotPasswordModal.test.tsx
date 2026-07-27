import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

vi.mock("../../services/authService", () => ({
  sendForgotPasswordOtp: vi.fn(),
  resetPassword: vi.fn(),
  extractErrorMessage: vi.fn(() => "err"),
}));

describe("ForgotPasswordModal — keyboard", () => {
  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});
