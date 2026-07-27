import { useState, useEffect, useCallback } from "react";
import type { Message } from "../types";
import { getMessages, getMessagePage } from "../services/messageService";

const DEFAULT_LIMIT = 50;

export interface MessageDeletedEvent {
  messageId: string;
  deletedAt: string;
}

export interface MessageReadEvent {
  caseId: string;
  messageId: string;
  readBy: {
    userId: string;
    readAt: string;
  }[];
}

export interface MessageReactionsEvent {
  messageId: string;
  reactions: { emoji: string; userIds: string[] }[];
}

export interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  appendMessage: (msg: Message) => void;
  updateDeletedMessage: (event: MessageDeletedEvent) => void;
  updateEditedMessage: (message: Message) => void;
  updateMessageRead: (event: MessageReadEvent) => void;
  updateMessageReactions: (event: MessageReactionsEvent) => void;
  updatePinnedMessage: (message: Message) => void;
  updateUnpinnedMessage: (messageId: string) => void;
  loadUntilMessage: (messageId: string) => Promise<boolean>;
}

/**
 * Manages message state for a given case.
 * - Fetches page 1 on caseId change
 * - Supports upward pagination via loadMore
 * - Exposes handlers for real-time socket events (appendMessage, updateDeletedMessage)
 */
export const useMessages = (caseId: string | undefined): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial page whenever caseId changes
  useEffect(() => {
    if (!caseId) {
      setMessages([]);
      setCurrentPage(1);
      setTotalPages(1);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchInitial = async () => {
      setIsLoading(true);
      setError(null);
      setMessages([]);
      setCurrentPage(1);

      try {
        const page = await getMessages(caseId, 1, DEFAULT_LIMIT);
        if (!cancelled) {
          // Messages from API are newest-first, reverse to oldest-first for display
          const ordered = [...page.messages].reverse();
          setMessages(ordered);
          setCurrentPage(page.page);
          setTotalPages(page.totalPages);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load messages.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const hasMore = currentPage < totalPages;

  /**
   * Load the next (older) page and prepend to the existing list.
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!caseId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const page = await getMessages(caseId, nextPage, DEFAULT_LIMIT);
      const olderMessages = [...page.messages].reverse();

      setMessages((prev) => [...olderMessages, ...prev]);
      setCurrentPage(page.page);
      setTotalPages(page.totalPages);
    } catch {
      // Non-critical — user can try scrolling again
    } finally {
      setIsLoadingMore(false);
    }
  }, [caseId, currentPage, isLoadingMore, hasMore]);

  /**
   * Append a new message received via socket new_message event.
   */
  const appendMessage = useCallback((msg: Message): void => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /**
   * Soft-delete a message by its ID when message_deleted socket event arrives.
   */
  const updateDeletedMessage = useCallback(
    ({ messageId, deletedAt }: MessageDeletedEvent): void => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, isDeleted: true, deletedAt } : msg,
        ),
      );
    },
    [],
  );

  const updateEditedMessage = useCallback((message: Message): void => {
    setMessages((prev) =>
      prev.map((msg) => (msg._id === message._id ? { ...msg, ...message } : msg)),
    );
  }, []);

  /**
   * Update message read.
   */
  const updateMessageRead = useCallback((event: MessageReadEvent): void => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id === event.messageId) {
          return {
            ...msg,
            readBy: event.readBy,
          };
        }
        return msg;
      }),
    );
  }, []);

  /**
   * Update message reactions.
   */
  const updateMessageReactions = useCallback((event: MessageReactionsEvent): void => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id === event.messageId) {
          return {
            ...msg,
            reactions: event.reactions,
          };
        }
        return msg;
      }),
    );
  }, []);

  /**
   * Loads older pages sequentially until the target messageId is present.
   * Returns true if the message is found/loaded, false otherwise.
   */
  const loadUntilMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!caseId) return false;

      // 1. Check if already loaded
      if (messages.some((m) => m._id === messageId)) return true;

      try {
        // 2. Resolve which page it's on
        const targetPage = await getMessagePage(caseId, messageId, DEFAULT_LIMIT);
        if (targetPage <= currentPage) return true; // Should have been in messages if on current/prev pages

        // 3. Load pages sequentially until targetPage is reached
        // Note: Using a for-loop here to ensure we don't spam requests and handle errors
        let success = true;
        for (let p = currentPage + 1; p <= targetPage; p++) {
          try {
            const result = await getMessages(caseId, p, DEFAULT_LIMIT);
            const older = [...result.messages].reverse();
            setMessages((prev) => [...older, ...prev]);
            setCurrentPage(result.page);
            setTotalPages(result.totalPages);
          } catch (err) {
            console.error(`Failed to load page ${p} while jumping:`, err);
            success = false;
            break;
          }
        }
        return success;
      } catch (err) {
        console.error("Failed to resolve message page:", err);
        return false;
      }
    },
    [caseId, currentPage, messages],
  );

  const updatePinnedMessage = useCallback((message: Message): void => {
    setMessages((prev) =>
      prev.map((msg) => (msg._id === message._id ? { ...msg, ...message } : msg)),
    );
  }, []);

  const updateUnpinnedMessage = useCallback((messageId: string): void => {
    setMessages((prev) =>
      prev.map((msg) => (msg._id === messageId ? { ...msg, isPinned: false, pinnedAt: undefined, pinnedBy: undefined } : msg)),
    );
  }, []);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    appendMessage,
    updateDeletedMessage,
    updateEditedMessage,
    updateMessageRead,
    updateMessageReactions,
    updatePinnedMessage,
    updateUnpinnedMessage,
    loadUntilMessage,
  };
};
