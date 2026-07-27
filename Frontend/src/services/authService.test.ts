import type { AxiosAdapter } from "axios"

import {
  register,
  login,
  signout,
  getMe,
  changePassword,
  updatePhone,
  extractErrorMessage,
} from "./authService"

// We test against a real Axios instance with a custom adapter to intercept
// the requests — this validates that authService calls the correct endpoints.

interface CapturedRequest {
  url?: string
  method?: string
  data?: string
}

const createMockAdapter = (
  responseData: unknown,
  status = 200,
): { adapter: AxiosAdapter; captured: CapturedRequest } => {
  const captured: CapturedRequest = {}

  const adapter: AxiosAdapter = async (config) => {
    captured.url = config.url
    captured.method = config.method
    captured.data = config.data as string

    return {
      data: responseData,
      status,
      statusText: "OK",
      headers: {},
      config,
    }
  }

  return { adapter, captured }
}

// Replace the default api instance used by authService
vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api")

  // Create a client with no real interceptors for testing
  const testClient = actual.createApiClient({
    getToken: () => null,
    clearToken: () => {},
    getPathname: () => "/",
    redirectToLogin: () => {},
  })

  return {
    ...actual,
    default: testClient,
    api: testClient,
  }
})

// We need to get access to the mocked api instance to set adapters
const getMockedApi = async () => {
  const mod = await import("./api")
  return mod.default
}

describe("authService", () => {
  describe("login", () => {
    it("calls POST /auth/login with employeeId and password and returns OTP challenge", async () => {
      const api = await getMockedApi()
      // The login endpoint now returns an OTP challenge, not a token directly
      const responseData = {
        success: true,
        message: "OTP sent to your email",
        requireOtp: true,
        tempToken: "temp-jwt",
        email: "alice@example.com",
      }
      const { adapter, captured } = createMockAdapter(responseData)
      api.defaults.adapter = adapter

      const result = await login("EMP001", "Password1")

      expect(captured.method).toBe("post")
      expect(captured.url).toBe("/auth/login")
      expect(JSON.parse(captured.data!)).toEqual({
        employeeId: "EMP001",
        password: "Password1",
      })
      expect(result).toEqual({
        success: true,
        message: "OTP sent to your email",
        requireOtp: true,
        tempToken: "temp-jwt",
        email: "alice@example.com",
      })
    })
  })

  describe("register", () => {
    it("calls POST /auth/register with all user fields", async () => {
      const api = await getMockedApi()
      const responseData = {
        success: true,
        message: "User registered successfully",
        user: { _id: "u2", name: "New User" },
        token: "new-jwt",
      }
      const { adapter, captured } = createMockAdapter(responseData)
      api.defaults.adapter = adapter

      const payload = {
        employeeId: "EMP002",
        name: "New User",
        email: "new@test.com",
        phone: "1234567890",
        password: "Password1",
      }

      const result = await register(payload)

      expect(captured.method).toBe("post")
      expect(captured.url).toBe("/auth/register")
      expect(JSON.parse(captured.data!)).toEqual(payload)
      expect(result).toEqual({
        user: { _id: "u2", name: "New User" },
        token: "new-jwt",
      })
    })
  })

  describe("signout", () => {
    it("calls POST /auth/signout", async () => {
      const api = await getMockedApi()
      const { adapter, captured } = createMockAdapter({
        success: true,
        message: "Logged out",
      })
      api.defaults.adapter = adapter

      await signout()

      expect(captured.method).toBe("post")
      expect(captured.url).toBe("/auth/signout")
    })
  })

  describe("getMe", () => {
    it("calls GET /auth/me and returns the user", async () => {
      const api = await getMockedApi()
      const responseData = {
        success: true,
        user: { _id: "u1", name: "Me" },
      }
      const { adapter, captured } = createMockAdapter(responseData)
      api.defaults.adapter = adapter

      const user = await getMe()

      expect(captured.method).toBe("get")
      expect(captured.url).toBe("/auth/me")
      expect(user).toEqual({ _id: "u1", name: "Me" })
    })
  })

  describe("changePassword", () => {
    it("calls POST /auth/change-password with passwords", async () => {
      const api = await getMockedApi()
      const { adapter, captured } = createMockAdapter({
        success: true,
        message: "Password changed",
      })
      api.defaults.adapter = adapter

      await changePassword("OldPass1", "NewPass1")

      expect(captured.method).toBe("post")
      expect(captured.url).toBe("/auth/change-password")
      expect(JSON.parse(captured.data!)).toEqual({
        currentPassword: "OldPass1",
        newPassword: "NewPass1",
      })
    })
  })

  describe("updatePhone", () => {
    it("calls PATCH /auth/phone with new phone number", async () => {
      const api = await getMockedApi()
      const responseData = {
        success: true,
        message: "Phone number updated successfully",
        user: { _id: "u1", phone: "9876543210" },
      }
      const { adapter, captured } = createMockAdapter(responseData)
      api.defaults.adapter = adapter

      const user = await updatePhone("9876543210")

      expect(captured.method).toBe("patch")
      expect(captured.url).toBe("/auth/phone")
      expect(JSON.parse(captured.data!)).toEqual({ phone: "9876543210" })
      expect(user).toEqual({ _id: "u1", phone: "9876543210" })
    })
  })

  describe("extractErrorMessage", () => {
    it("extracts message from axios error response", () => {
      const error = {
        response: {
          data: { success: false, message: "Invalid credentials" },
        },
      }
      expect(extractErrorMessage(error)).toBe("Invalid credentials")
    })

    it("returns default message when no response data", () => {
      expect(extractErrorMessage(new Error("network"))).toBe(
        "An unexpected error occurred",
      )
    })

    it("returns default message for null error", () => {
      expect(extractErrorMessage(null)).toBe("An unexpected error occurred")
    })
  })
})
