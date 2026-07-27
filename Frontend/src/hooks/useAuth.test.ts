import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { AuthContext } from "../contexts/AuthContext";
import { createElement, type ReactNode } from "react";
import type { AuthContextValue } from "../contexts/AuthContext";

describe("useAuth", () => {
  it("throws error if used outside of AuthProvider", () => {
    // Suppress console.error for this test as we expect an error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );

    consoleSpy.mockRestore();
  });

  it("returns context value when used within AuthProvider", () => {
    const mockValue: AuthContextValue = {
      user: {
        _id: "1",
        employeeId: "EMP001",
        name: "Alice",
        email: "alice@example.com",
        phone: "555-0101",
        lastSeen: null,
        pinnedCases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: "token",
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      verifyLoginOtp: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      updateProfilePicture: vi.fn(),
    };

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(AuthContext.Provider, { value: mockValue }, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBe(mockValue);
  });
});
