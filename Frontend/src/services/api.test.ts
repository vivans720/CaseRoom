import type {
  AxiosAdapter,
  AxiosRequestHeaders,
  InternalAxiosRequestConfig,
} from "axios"

import { createApiClient } from "./api"

const createDependencies = (overrides = {}) => ({
  getToken: vi.fn(() => null),
  clearToken: vi.fn(),
  getPathname: vi.fn(() => "/dashboard"),
  redirectToLogin: vi.fn(),
  ...overrides,
})

const getAuthorizationHeader = (config: InternalAxiosRequestConfig) => {
  const headers = config.headers as AxiosRequestHeaders & {
    get?: (headerName: string) => string | undefined
  }

  return headers.get?.("Authorization") ?? headers.Authorization
}

const createCaptureAdapter = (
  captureConfig: (config: InternalAxiosRequestConfig) => void,
): AxiosAdapter => {
  return async (config) => {
    captureConfig(config)

    return {
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }
  }
}

const unauthorizedAdapter: AxiosAdapter = async (config) => {
  return Promise.reject({
    isAxiosError: true,
    response: {
      data: {},
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
    },
    config,
    toJSON: () => ({}),
  })
}

describe("api client", () => {
  it("adds an authorization header when a token exists", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined
    const dependencies = createDependencies({
      getToken: vi.fn(() => "test-token"),
    })
    const client = createApiClient(dependencies)

    await client.get("/cases", {
      adapter: createCaptureAdapter((config) => {
        capturedConfig = config
      }),
    })

    expect(capturedConfig).toBeDefined()
    expect(getAuthorizationHeader(capturedConfig!)).toBe("Bearer test-token")
  })

  it("does not add an authorization header when no token exists", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined
    const dependencies = createDependencies()
    const client = createApiClient(dependencies)

    await client.get("/cases", {
      adapter: createCaptureAdapter((config) => {
        capturedConfig = config
      }),
    })

    expect(capturedConfig).toBeDefined()
    expect(getAuthorizationHeader(capturedConfig!)).toBeUndefined()
  })

  it("clears auth state and redirects to login after a 401 outside auth routes", async () => {
    const dependencies = createDependencies({
      getPathname: vi.fn(() => "/dashboard"),
    })
    const client = createApiClient(dependencies)

    await expect(
      client.get("/cases", { adapter: unauthorizedAdapter }),
    ).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(dependencies.clearToken).toHaveBeenCalledOnce()
    expect(dependencies.redirectToLogin).toHaveBeenCalledOnce()
  })

  it("clears auth state without redirecting after a 401 on auth routes", async () => {
    const dependencies = createDependencies({
      getPathname: vi.fn(() => "/login"),
    })
    const client = createApiClient(dependencies)

    await expect(
      client.get("/cases", { adapter: unauthorizedAdapter }),
    ).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(dependencies.clearToken).toHaveBeenCalledOnce()
    expect(dependencies.redirectToLogin).not.toHaveBeenCalled()
  })
})
