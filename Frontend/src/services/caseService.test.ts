import { describe, it, expect, vi, beforeEach } from "vitest"
import * as caseService from "./caseService"
import api from "./api"
import type { Case } from "../types"

vi.mock("./api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

const mockCase: Case = {
  _id: "case-1",
  title: "Test Case",
  description: "A test case",
  creatorId: "user-1",
  status: "active",
  participants: ["user-1"],
  isPinned: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createCase", () => {
  it("posts to /cases and returns the created case", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, message: "Case created", data: mockCase },
    })

    const result = await caseService.createCase("Test Case", "A test case")

    expect(mockedApi.post).toHaveBeenCalledWith("/cases", {
      title: "Test Case",
      description: "A test case",
    })
    expect(result).toEqual(mockCase)
  })

  it("omits description when not provided", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, message: "Case created", data: mockCase },
    })

    await caseService.createCase("Test Case")

    expect(mockedApi.post).toHaveBeenCalledWith("/cases", { title: "Test Case" })
  })

  it("omits description when empty string", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, message: "Case created", data: mockCase },
    })

    await caseService.createCase("Test Case", "   ")

    expect(mockedApi.post).toHaveBeenCalledWith("/cases", { title: "Test Case" })
  })
})

describe("getUserCases", () => {
  it("gets /cases and returns an array of cases", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: [mockCase] },
    })

    const result = await caseService.getUserCases()

    expect(mockedApi.get).toHaveBeenCalledWith("/cases")
    expect(result).toEqual([mockCase])
  })

  it("returns empty array when no cases", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: [] },
    })

    const result = await caseService.getUserCases()

    expect(result).toEqual([])
  })
})

describe("pinCase", () => {
  it("puts to /cases/:id/pin", async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true } })

    await caseService.pinCase("case-1")

    expect(mockedApi.put).toHaveBeenCalledWith("/cases/case-1/pin")
  })
})

describe("unpinCase", () => {
  it("deletes /cases/:id/pin", async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: { success: true } })

    await caseService.unpinCase("case-1")

    expect(mockedApi.delete).toHaveBeenCalledWith("/cases/case-1/pin")
  })
})

describe("getUnreadCount", () => {
  it("gets /cases/:id/unread-count and returns the count", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { unreadCount: 5 } },
    })

    const result = await caseService.getUnreadCount("case-1")

    expect(mockedApi.get).toHaveBeenCalledWith("/cases/case-1/unread-count")
    expect(result).toBe(5)
  })
})
