import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ChangePasswordModal } from "../../components/profile/ChangePasswordModal";
import * as authService from "../../services/authService";

// Mock authService
vi.mock("../../services/authService", () => ({
  changePassword: vi.fn(),
  extractErrorMessage: vi.fn(
    (err: unknown) => (err as Error).message || "Unknown error",
  ),
}));

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<ChangePasswordModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Change Password")).not.toBeInTheDocument();
  });

  it("shows error if current password is empty on submit", () => {
    const onClose = vi.fn();
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    fireEvent.submit(
      screen.getByRole("button", { name: "Update Password" }).closest("form")!,
    );

    expect(
      screen.getByText("Please enter your current password"),
    ).toBeInTheDocument();
  });

  it("shows validation error if new password does not meet criteria", () => {
    const onClose = vi.fn();
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Current Password"), {
      target: { value: "oldPassword123" },
    });
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "short" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: "Update Password" }).closest("form")!,
    );

    expect(
      screen.getByText(/must be at least 8 characters long/i),
    ).toBeInTheDocument();
  });

  it("shows error if passwords do not match", () => {
    const onClose = vi.fn();
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Current Password"), {
      target: { value: "oldPassword123" },
    });
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "ValidPassword1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "Different1" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: "Update Password" }).closest("form")!,
    );

    expect(screen.getByText("New passwords do not match")).toBeInTheDocument();
  });

  it("calls API and shows success state on successful password change", async () => {
    vi.mocked(authService.changePassword).mockResolvedValue();
    const onClose = vi.fn();
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Current Password"), {
      target: { value: "oldPassword123" },
    });
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "ValidPassword1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "ValidPassword1" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: "Update Password" }).closest("form")!,
    );

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith(
        "oldPassword123",
        "ValidPassword1",
      );
    });

    expect(screen.getByText("Password Changed")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("displays server error accessibly on failed change", async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(
      new Error("Invalid current password"),
    );
    const onClose = vi.fn();
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Current Password"), {
      target: { value: "wrongold123" },
    });
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "ValidPassword1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "ValidPassword1" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: "Update Password" }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid current password",
      );
    });
  });
});
