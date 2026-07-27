import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMessages } from "./useMessages";
import { getMessages, getMessagePage } from "../services/messageService";
import type { Message } from "../types";

vi.mock("../services/messageService");

const mockMessages: Message[] = [
  {
    _id: "1",
    caseId: "case-1",
    senderId: "user-1",
    content: "Message 1",
    type: "text",
    isDeleted: false,
    readBy: [],
    createdAt: "2026-04-16",
    updatedAt: "2026-04-16",
  },
  {
    _id: "2",
    caseId: "case-1",
    senderId: "user-2",
    content: "Message 2",
    type: "text",
    isDeleted: false,
    readBy: [],
    createdAt: "2026-04-16",
    updatedAt: "2026-04-16",
  },
];

describe("useMessages hook", () => {
  beforeEach(() => {
    vi.mocked(getMessages).mockReset();
    vi.mocked(getMessagePage).mockReset();
    vi.mocked(getMessages).mockResolvedValue({
      messages: mockMessages,
      page: 1,
      totalPages: 3,
      total: 15,
    });
  });

  it("initializes and fetches messages correctly", async () => {
    const { result } = renderHook(() => useMessages("case-1"));

    expect(result.current.isLoading).toBe(true);

    // Wait for the mock to resolve
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The hook reverses messages for display logic!
    expect(result.current.messages[0]._id).toBe("2");
    expect(result.current.messages).toHaveLength(2);
  });

  it("appends a new message via appendMessage", async () => {
    const { result } = renderHook(() => useMessages("case-1"));

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newMsg: Message = {
      _id: "3",
      caseId: "case-1",
      senderId: "user-1",
      content: "Message 3",
      type: "text",
      isDeleted: false,
      readBy: [],
      createdAt: "2026-04-16",
      updatedAt: "2026-04-16",
    };

    act(() => {
      result.current.appendMessage(newMsg);
    });

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2]._id).toBe("3");
  });

  it("updates a deleted message via updateDeletedMessage without removing it", async () => {
    const { result } = renderHook(() => useMessages("case-1"));

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const deletedAt = "2026-04-16T12:00:00Z";

    act(() => {
      result.current.updateDeletedMessage({
        messageId: "1",
        deletedAt,
      });
    });

    // Reversed order, ID '2' is at index 0, ID '1' is at index 1
    const deletedMsg = result.current.messages.find((m) => m._id === "1");
    expect(deletedMsg?.isDeleted).toBe(true);
    expect(deletedMsg?.deletedAt).toBe(deletedAt);
  });

  it("loadUntilMessage loads sequential pages until message is found", async () => {
    const { result } = renderHook(() => useMessages("case-1"));

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    // Target message is on page 3
    vi.mocked(getMessagePage).mockResolvedValue(3);
    
    // Page 2 mock
    const page2Msg: Message = { ...mockMessages[0], _id: "page2-msg" };
    // Page 3 mock
    const targetMsg: Message = { ...mockMessages[0], _id: "target-id" };

    // Initial fetch already used beforeEach default; only queue page 2 + 3 for loadUntilMessage.
    vi.mocked(getMessages)
      .mockResolvedValueOnce({ messages: [page2Msg], page: 2, totalPages: 3, total: 15 })
      .mockResolvedValueOnce({ messages: [targetMsg], page: 3, totalPages: 3, total: 15 });

    let found = false;
    await act(async () => {
      found = await result.current.loadUntilMessage("target-id");
    });

    expect(found).toBe(true);
    expect(getMessages).toHaveBeenCalledTimes(3); // Initial (default) + page 2 + page 3
    expect(result.current.messages.some((m) => m._id === "target-id")).toBe(true);
    expect(result.current.messages.some((m) => m._id === "page2-msg")).toBe(true);
  });

  it("loadUntilMessage returns true immediately if message already loaded", async () => {
    const { result } = renderHook(() => useMessages("case-1"));
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    let found = false;
    await act(async () => {
      found = await result.current.loadUntilMessage("1");
    });

    expect(found).toBe(true);
    expect(getMessagePage).not.toHaveBeenCalled();
  });
});
