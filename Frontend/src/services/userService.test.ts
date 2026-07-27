import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchUsers } from "./userService"
import api from "./api"
import type { User } from "../types"

vi.mock("./api")

const mockedApi = vi.mocked(api)

const makeUser = (overrides: Partial<User> = {}): User => ({
  _id: "user-1",
  employeeId: "EMP001",
  name: "Alice Smith",
  email: "alice@example.com",
  phone: "1234567890",
  lastSeen: null,
  pinnedCases: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("searchUsers — validation", () => {
  it("throws when query is an empty string", async () => {
    await expect(searchUsers("")).rejects.toThrow(
      "Search query must be at least 1 character.",
    )
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it("throws when query is only whitespace", async () => {
    await expect(searchUsers("   ")).rejects.toThrow(
      "Search query must be at least 1 character.",
    )
    expect(mockedApi.get).not.toHaveBeenCalled()
  })
})

describe("searchUsers — successful request", () => {
  it("calls GET /users/search with trimmed query", async () => {
    const users = [makeUser()]
    mockedApi.get.mockResolvedValue({ data: { success: true, data: users } })

    const result = await searchUsers("  Alice  ")

    expect(mockedApi.get).toHaveBeenCalledWith("/users/search", {
      params: { q: "Alice" },
    })
    expect(result).toEqual(users)
  })

  it("includes excludeIds as a comma-separated string when provided", async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: [] } })

    await searchUsers("Bob", ["user-1", "user-2"])

    expect(mockedApi.get).toHaveBeenCalledWith("/users/search", {
      params: { q: "Bob", excludeIds: "user-1,user-2" },
    })
  })

  it("omits excludeIds param when array is empty", async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: [] } })

    await searchUsers("Alice", [])

    expect(mockedApi.get).toHaveBeenCalledWith("/users/search", {
      params: { q: "Alice" },
    })
  })

  it("returns an empty array when no users match", async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: [] } })

    const result = await searchUsers("xyz-not-found")

    expect(result).toEqual([])
  })
})
