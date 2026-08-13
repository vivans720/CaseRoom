import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { ProfileModal } from "../../components/profile/ProfileModal";
import { useAuth } from "../../hooks/useAuth";
import type { User } from "../../types";

// Mock dependencies
vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockUser: User = {
  _id: "u1",
  employeeId: "EMP123",
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "1234567890",
  profilePictureUrl: null,
  lastSeen: null,
  pinnedCases: [],
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2023-01-01T00:00:00.000Z",
};

describe("ProfileModal", () => {
  it("does not render when isOpen is false", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      updateProfilePicture: vi.fn(),
      updatePhone: vi.fn(),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    render(<ProfileModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText("My Profile")).not.toBeInTheDocument();
  });

  it("does not render when user is null", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as unknown as ReturnType<
      typeof useAuth
    >);
    render(<ProfileModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByText("My Profile")).not.toBeInTheDocument();
  });

  it("renders user data correctly", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      updateProfilePicture: vi.fn(),
      updatePhone: vi.fn(),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    const onClose = vi.fn();
    render(<ProfileModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("EMP123")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
    expect(screen.getByText(/2023/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Choose profile picture")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
  });

  it("allows editing phone number", async () => {
    const updatePhoneMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      updateProfilePicture: vi.fn(),
      updatePhone: updatePhoneMock,
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(<ProfileModal isOpen={true} onClose={vi.fn()} />);

    const editBtns = screen.getAllByRole("button", { name: "Edit" });
    // Click the last Edit button which is for Phone in the current UI
    fireEvent.click(editBtns[editBtns.length - 1]);

    const phoneInput = screen.getByPlaceholderText("Enter phone number") as HTMLInputElement;
    expect(phoneInput.value).toBe("1234567890");
  });
});
