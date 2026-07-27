import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCases } from "./useCases";
import * as caseService from "../services/caseService";
import { useSocket } from "./useSocket";
import type { Case } from "../types";
import type { Socket } from "socket.io-client";

vi.mock("../services/caseService");
vi.mock("./useSocket");
vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: { _id: "user-1" } }),
}));

const mockedCaseService = vi.mocked(caseService);
const mockedUseSocket = vi.mocked(useSocket);

const makeCase = (overrides: Partial<Case> = {}): Case => ({
  _id: "case-1",
  title: "Test Case",
  creatorId: "user-1",
  status: "active",
  participants: ["user-1"],
  isPinned: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedCaseService.getUnreadCount.mockResolvedValue(0);
  mockedUseSocket.mockReturnValue({
    socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as unknown as Socket,
    isConnected: true,
  });
});

describe("useCases — initial fetch", () => {
  it("fetches cases on mount and sets isLoading false", async () => {
    const cases = [makeCase()];
    mockedCaseService.getUserCases.mockResolvedValue(cases);

    const { result } = renderHook(() => useCases());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.cases).toEqual(cases);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    mockedCaseService.getUserCases.mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useCases());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe(
      "Failed to load cases. Please try again.",
    );
    expect(result.current.cases).toEqual([]);
  });
});

describe("useCases — derived values", () => {
  it("splits cases into pinnedCases and unpinnedCases", async () => {
    const pinned = makeCase({ _id: "case-pinned", isPinned: true });
    const unpinned = makeCase({ _id: "case-unpinned", isPinned: false });
    mockedCaseService.getUserCases.mockResolvedValue([pinned, unpinned]);

    const { result } = renderHook(() => useCases());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pinnedCases).toEqual([pinned]);
    expect(result.current.unpinnedCases).toEqual([unpinned]);
  });
});

describe("useCases — createCase", () => {
  it("creates a case and re-fetches the list", async () => {
    const newCase = makeCase({ _id: "case-new", title: "New Case" });
    mockedCaseService.getUserCases.mockResolvedValue([newCase]);
    mockedCaseService.createCase.mockResolvedValue(newCase);

    const { result } = renderHook(() => useCases());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.clearAllMocks();
    mockedCaseService.getUserCases.mockResolvedValue([newCase]);
    mockedCaseService.getUnreadCount.mockResolvedValue(0);
    mockedCaseService.createCase.mockResolvedValue(newCase);

    let returned: Case | undefined;
    await act(async () => {
      returned = await result.current.createCase("New Case", "desc");
    });

    expect(mockedCaseService.createCase).toHaveBeenCalledWith(
      "New Case",
      "desc",
    );
    expect(mockedCaseService.getUserCases).toHaveBeenCalled();
    expect(returned).toEqual(newCase);
  });
});

describe("useCases — pinCase", () => {
  it("pins a case and re-fetches the list", async () => {
    mockedCaseService.getUserCases.mockResolvedValue([makeCase()]);
    mockedCaseService.pinCase.mockResolvedValue();

    const { result } = renderHook(() => useCases());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockedCaseService.getUserCases.mockResolvedValue([
      makeCase({ isPinned: true }),
    ]);

    await act(async () => {
      await result.current.pinCase("case-1");
    });

    expect(mockedCaseService.pinCase).toHaveBeenCalledWith("case-1");
    expect(mockedCaseService.getUserCases).toHaveBeenCalledTimes(2);
  });
});

describe("useCases — unpinCase", () => {
  it("unpins a case and re-fetches the list", async () => {
    mockedCaseService.getUserCases.mockResolvedValue([
      makeCase({ isPinned: true }),
    ]);
    mockedCaseService.unpinCase.mockResolvedValue();

    const { result } = renderHook(() => useCases());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockedCaseService.getUserCases.mockResolvedValue([
      makeCase({ isPinned: false }),
    ]);

    await act(async () => {
      await result.current.unpinCase("case-1");
    });

    expect(mockedCaseService.unpinCase).toHaveBeenCalledWith("case-1");
    expect(mockedCaseService.getUserCases).toHaveBeenCalledTimes(2);
  });
});

describe("useCases — unreadCounts", () => {
  it("fetches unread counts for each case", async () => {
    mockedCaseService.getUserCases.mockResolvedValue([
      makeCase({ _id: "case-1" }),
      makeCase({ _id: "case-2" }),
    ]);
    mockedCaseService.getUnreadCount
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7);

    const { result } = renderHook(() => useCases());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.unreadCounts).toEqual({ "case-1": 3, "case-2": 7 });
  });

  it("defaults to 0 when unread count fetch fails for a case", async () => {
    mockedCaseService.getUserCases.mockResolvedValue([
      makeCase({ _id: "case-1" }),
    ]);
    mockedCaseService.getUnreadCount.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCases());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.unreadCounts["case-1"]).toBe(0);
  });
});
