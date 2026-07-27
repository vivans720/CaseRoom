import type { AxiosError } from "axios";

import api from "./api";
import type { User } from "../types";

export interface RegisterData {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  token: string;
}

export interface LoginOtpResponse {
  success: boolean;
  message: string;
  requireOtp: boolean;
  tempToken: string;
  email: string;
}

interface BasicResponse {
  success: boolean;
  message: string;
}

interface MeResponse {
  success: boolean;
  user: User;
}

interface ProfilePictureResponse {
  success: boolean;
  message: string;
  user: User;
}

interface ErrorResponseData {
  success: boolean;
  message: string;
}

export const extractErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object")
    return "An unexpected error occurred";
  const axiosError = error as AxiosError<ErrorResponseData>;
  return axiosError.response?.data?.message ?? "An unexpected error occurred";
};

export const sendRegisterOtp = async (data: RegisterData): Promise<string> => {
  const response = await api.post<BasicResponse>(
    "/auth/register/send-otp",
    data,
  );
  return response.data.message;
};

export const register = async (
  data: RegisterData,
  otp: string,
): Promise<{ user: User; token: string }> => {
  const response = await api.post<AuthResponse>("/auth/register", {
    ...data,
    otp,
  });
  return { user: response.data.user, token: response.data.token };
};

export const login = async (
  employeeId: string,
  password: string,
): Promise<LoginOtpResponse> => {
  const response = await api.post<LoginOtpResponse>("/auth/login", {
    employeeId,
    password,
  });
  return response.data;
};

export const verifyLoginOtp = async (
  tempToken: string,
  otp: string,
): Promise<{ user: User; token: string }> => {
  const response = await api.post<AuthResponse>("/auth/login/verify", {
    tempToken,
    otp,
  });
  return { user: response.data.user, token: response.data.token };
};

export const sendForgotPasswordOtp = async (email: string): Promise<string> => {
  const response = await api.post<BasicResponse>(
    "/auth/forgot-password/send-otp",
    { email },
  );
  return response.data.message;
};

export const resendOtp = async (
  email: string,
  type: "registration" | "login" | "reset_password",
): Promise<string> => {
  const response = await api.post<BasicResponse>("/auth/resend-otp", {
    email,
    type,
  });
  return response.data.message;
};

export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
): Promise<string> => {
  const response = await api.post<BasicResponse>(
    "/auth/forgot-password/reset",
    {
      email,
      otp,
      newPassword,
    },
  );
  return response.data.message;
};

export const signout = async (): Promise<void> => {
  await api.post("/auth/signout");
};

export const getMe = async (): Promise<User> => {
  const response = await api.get<MeResponse>("/auth/me");
  return response.data.user;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  await api.post("/auth/change-password", { currentPassword, newPassword });
};

export const updatePhone = async (phone: string): Promise<User> => {
  const response = await api.patch<{ success: boolean; message: string; user: User }>(
    "/auth/phone",
    { phone },
  );
  return response.data.user;
};

export const updateProfilePicture = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.patch<ProfilePictureResponse>(
    "/auth/profile-picture",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data.user;
};
