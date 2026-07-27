import { useState, useEffect, useCallback } from "react";
import type { Case } from "../types";
import * as caseService from "../services/caseService";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";

interface NewMessagePayload {
  caseId: string | { _id: string };
  senderId: string | { _id: string };
}

interface MessageReadPayload {
  caseId: string | { _id: string };
}

export interface UseCasesReturn {
  cases: Case[];
  pinnedCases: Case[];
  unpinnedCases: Case[];
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  fetchCases: () => Promise<void>;
  createCase: (title: string, description?: string) => Promise<Case>;
  pinCase: (caseId: string) => Promise<void>;
  unpinCase: (caseId: string) => Promise<void>;
  updateLocalUnreadCount: (caseId: string, countChange: number) => void;
}

const fetchUnreadCounts = async (
  cases: Case[],
): Promise<Record<string, number>> => {
  const results = await Promise.allSettled(
    cases.map((c) => caseService.getUnreadCount(c._id)),
  );

  return cases.reduce<Record<string, number>>((acc, c, index) => {
    const result = results[index];
    acc[c._id] = result.status === "fulfilled" ? result.value : 0;
    return acc;
  }, {});
};

export const useCases = (): UseCasesReturn => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [cases, setCases] = useState<Case[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedCases = await caseService.getUserCases();
      setCases(fetchedCases);

      const counts = await fetchUnreadCounts(fetchedCases);
      setUnreadCounts(counts);
    } catch {
      setError("Failed to load cases. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const refreshUnreadCounts = useCallback(async (): Promise<void> => {
    try {
      const counts = await fetchUnreadCounts(cases);
      setUnreadCounts(counts);
    } catch (err) {
      console.error("Failed to refresh unread counts:", err);
    }
  }, [cases]);

  useEffect(() => {
    fetchCases();

    const handleRefresh = () => {
      void fetchCases();
    };
    window.addEventListener("caseroom:refresh_cases", handleRefresh);
    
    return () => {
      window.removeEventListener("caseroom:refresh_cases", handleRefresh);
    };
  }, [fetchCases]);

  // Listen for socket events to adjust unread counts
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: NewMessagePayload) => {
      console.log("[useCases] new_message received:", msg);
      // Ignore messages sent by ourselves
      const senderId =
        typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;
      if (senderId === user?._id) {
        console.log("[useCases] Ignoring own message");
        return;
      }

      const caseId =
        typeof msg.caseId === "string" ? msg.caseId : msg.caseId?._id;

      if (caseId) {
        console.log(`[useCases] Incrementing count for ${caseId}`);
        setUnreadCounts((prev) => ({
          ...prev,
          [caseId]: (prev[caseId] || 0) + 1,
        }));
      }
    };

    const handleMessageRead = (payload: MessageReadPayload) => {
      console.log("[useCases] message_read received:", payload);
      // Optimistic update: clear count for this case immediately
      const caseId =
        typeof payload.caseId === "string"
          ? payload.caseId
          : payload.caseId?._id;

      if (caseId) {
        console.log(`[useCases] Clearing count for ${caseId}`);
        setUnreadCounts((prev) => ({
          ...prev,
          [caseId]: 0,
        }));
      }
      // Sync with server in background
      refreshUnreadCounts().catch(console.error);
    };

    console.log("[useCases] Registering socket listeners");
    socket.on("new_message", handleNewMessage);
    socket.on("message_read", handleMessageRead);

    return () => {
      console.log("[useCases] Cleaning up socket listeners");
      socket.off("new_message", handleNewMessage);
      socket.off("message_read", handleMessageRead);
    };
  }, [socket, user, refreshUnreadCounts]);

  const createCase = useCallback(
    async (title: string, description?: string): Promise<Case> => {
      const newCase = await caseService.createCase(title, description);
      await fetchCases();
      return newCase;
    },
    [fetchCases],
  );

  const pinCase = useCallback(
    async (caseId: string): Promise<void> => {
      try {
        await caseService.pinCase(caseId);
        await fetchCases();
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        const errorMsg =
          error.response?.data?.message || error.message || "Failed to pin case";
        throw new Error(errorMsg);
      }
    },
    [fetchCases],
  );

  const unpinCase = useCallback(
    async (caseId: string): Promise<void> => {
      try {
        await caseService.unpinCase(caseId);
        await fetchCases();
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        const errorMsg =
          error.response?.data?.message || error.message || "Failed to unpin case";
        throw new Error(errorMsg);
      }
    },
    [fetchCases],
  );

  const updateLocalUnreadCount = useCallback(
    (caseId: string, countChange: number) => {
      setUnreadCounts((prev) => ({
        ...prev,
        [caseId]: Math.max(0, (prev[caseId] || 0) + countChange),
      }));
    },
    [],
  );

  const pinnedCases = cases.filter((c) => c.isPinned === true);
  const unpinnedCases = cases.filter((c) => c.isPinned !== true);

  return {
    cases,
    pinnedCases,
    unpinnedCases,
    unreadCounts,
    isLoading,
    error,
    fetchCases,
    createCase,
    pinCase,
    unpinCase,
    updateLocalUnreadCount,
  };
};
