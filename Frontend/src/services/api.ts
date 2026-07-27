import axios from "axios"
import type { AxiosError, AxiosInstance } from "axios"

import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "../config/constants"

const AUTH_ROUTES = new Set(["/login", "/register"])

interface ApiClientDependencies {
  getToken: () => string | null
  clearToken: () => void
  getPathname: () => string
  redirectToLogin: () => void
}

const defaultDependencies: ApiClientDependencies = {
  getToken: () => 
    localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
    sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY),
  clearToken: () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  },
  getPathname: () => window.location.pathname,
  redirectToLogin: () => {
    window.location.assign("/login")
  },
}

const isAuthRoute = (pathname: string) => AUTH_ROUTES.has(pathname)

export const createApiClient = (
  dependencies: ApiClientDependencies = defaultDependencies,
): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  })

  client.interceptors.request.use(
    (config) => {
      const token = dependencies.getToken()

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      return config
    },
    (error: AxiosError) => Promise.reject(error),
  )

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        dependencies.clearToken()

        if (!isAuthRoute(dependencies.getPathname())) {
          dependencies.redirectToLogin()
        }
      }

      return Promise.reject(error)
    },
  )

  return client
}

export const api = createApiClient()

export default api
