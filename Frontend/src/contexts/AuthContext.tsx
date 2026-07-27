import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode, JSX } from "react";

import type { User } from "../types";
import type { RegisterData } from "../services/authService";
import * as authService from "../services/authService";
import type { LoginOtpResponse } from "../services/authService";
import { AUTH_TOKEN_STORAGE_KEY } from "../config/constants";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    employeeId: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<LoginOtpResponse>;
  verifyLoginOtp: (tempToken: string, otp: string) => Promise<void>;
  register: (data: RegisterData, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  updatePhone: (phone: string) => Promise<void>;
  updateProfilePicture: (file: File) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

const getStoredToken = (): string | null =>
  localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
  sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

const clearStoredToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

const storeToken = (token: string, persistent: boolean): void => {
  clearStoredToken();
  if (persistent) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const validateSession = async () => {
      try {
        const fetchedUser = await authService.getMe();

        if (!cancelled) {
          setUser(fetchedUser);
          setToken(storedToken);
        }
      } catch {
        if (!cancelled) {
          clearStoredToken();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (
      employeeId: string,
      password: string,
      rememberMe: boolean,
    ): Promise<LoginOtpResponse> => {
      const response = await authService.login(employeeId, password);

      // Some backends (or test mocks) return a full session directly
      // without an OTP challenge. Handle both patterns gracefully.
      // Some backends (or test mocks) return a full session directly
      // without an OTP challenge. Handle both patterns gracefully.
      if (!response.requireOtp && "token" in response && "user" in response) {
        const res = response as unknown as { token: string; user: User };
        storeToken(res.token, rememberMe);
        setToken(res.token);
        setUser(res.user);
      }

      return response;
    },
    [],
  );

  const verifyLoginOtp = useCallback(
    async (tempToken: string, otp: string): Promise<void> => {
      const result = await authService.verifyLoginOtp(tempToken, otp);
      storeToken(result.token, true); // Assuming rememberMe is handled or default to true
      setToken(result.token);
      setUser(result.user);
    },
    [],
  );

  const register = useCallback(
    async (data: RegisterData, otp: string): Promise<void> => {
      const result = await authService.register(data, otp);
      storeToken(result.token, true);
      setToken(result.token);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.signout();
    } catch {
      // Best-effort signout — don't block on failure
    }
    clearStoredToken();
    setUser(null);
    setToken(null);
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<void> => {
      await authService.changePassword(currentPassword, newPassword);
    },
    [],
  );

  const updatePhone = useCallback(
    async (phone: string): Promise<void> => {
      const updatedUser = await authService.updatePhone(phone);
      setUser(updatedUser);
    },
    [],
  );

  const updateProfilePicture = useCallback(
    async (file: File): Promise<void> => {
      const updatedUser = await authService.updateProfilePicture(file);
      setUser(updatedUser);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: user !== null && token !== null,
      login,
      verifyLoginOtp,
      register,
      logout,
      changePassword,
      updatePhone,
      updateProfilePicture,
    }),
    [
      user,
      token,
      isLoading,
      login,
      verifyLoginOtp,
      register,
      logout,
      changePassword,
      updatePhone,
      updateProfilePicture,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
