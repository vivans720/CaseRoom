import { renderHook, waitFor, act } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import * as authService from "../services/authService";
import { AUTH_TOKEN_STORAGE_KEY } from "../config/constants";
import { createElement, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import type { LoginOtpResponse } from "../services/authService";
import type { User } from "../types";
import { vi } from "vitest";

vi.mock("../services/authService");

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(AuthProvider, null, children);

const createUser = (): User => ({
  _id: "1",
  employeeId: "EMP001",
  name: "Alice",
  email: "alice@example.com",
  phone: "555-0101",
  lastSeen: null,
  pinnedCases: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createDirectLoginResponse = (
  user: User,
): LoginOtpResponse & { token: string; user: User } => ({
  success: true,
  message: "Logged in",
  requireOtp: false,
  tempToken: "temp-token",
  email: user.email,
  token: "new-token",
  user,
});

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("initializes with isLoading true while validating token", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token");
    // Mock getMe to hang
    const getMePromise = new Promise(() => {});
    vi.mocked(authService.getMe).mockReturnValue(getMePromise);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("clears token and sets user to null if validation fails", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "invalid-token");
    vi.mocked(authService.getMe).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("sets user and token if validation succeeds", async () => {
    const mockUser = createUser();
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "valid-token");
    vi.mocked(authService.getMe).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.name).toBe("Alice");
    expect(result.current.token).toBe("valid-token");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("handles logout correctly", async () => {
    const mockUser = createUser();
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "valid-token");
    vi.mocked(authService.getMe).mockResolvedValue(mockUser);
    vi.mocked(authService.signout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("sets localStorage if rememberMe is true on direct login", async () => {
    const mockUser = createUser();
    vi.mocked(authService.login).mockResolvedValue(
      createDirectLoginResponse(mockUser),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("EMP001", "password", true);
    });

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("new-token");
    expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("sets sessionStorage if rememberMe is false on direct login", async () => {
    const mockUser = createUser();
    vi.mocked(authService.login).mockResolvedValue(
      createDirectLoginResponse(mockUser),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("EMP001", "password", false);
    });

    expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("new-token");
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
