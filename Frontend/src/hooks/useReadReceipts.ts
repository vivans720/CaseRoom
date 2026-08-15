import { useEffect, useRef, useCallback } from "react";

import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";

export const useReadReceipts = (caseId: string) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  // Track unread message IDs
  const unreadMessageIds = useRef<Set<string>>(new Set());
  const pendingNodes = useRef<Set<HTMLDivElement>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitReadReceipts = useCallback(() => {
    if (unreadMessageIds.current.size === 0 || !socket) return;

    socket.emit("mark_read", {
      caseId,
      messageIds: Array.from(unreadMessageIds.current),
    });

    unreadMessageIds.current.clear();
  }, [caseId, socket]);

  const emitReadReceiptsRef = useRef(emitReadReceipts);
  useEffect(() => {
    emitReadReceiptsRef.current = emitReadReceipts;
  }, [emitReadReceipts]);

  // Use an IntersectionObserver to flag messages when they appear on screen
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    unreadMessageIds.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        let hasNewVisible = false;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute("data-message-id");
            if (messageId) {
              unreadMessageIds.current.add(messageId);
              hasNewVisible = true;
              observer.unobserve(entry.target);
            }
          }
        });

        // Debounce emit
        if (hasNewVisible) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            emitReadReceiptsRef.current();
          }, 500);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      },
    );

    observerRef.current = observer;

    // Observe any nodes registered before observer was attached
    pendingNodes.current.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      observer.disconnect();
      observerRef.current = null;
    };
  }, [caseId]);

  // Callback ref applied to message bubbles
  const messageRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !user?._id) return;

      const isUnread = node.getAttribute("data-unread") === "true";
      const isOwn = node.getAttribute("data-own") === "true";

      // Only observe received unread messages
      if (isUnread && !isOwn) {
        pendingNodes.current.add(node);
        if (observerRef.current) {
          observerRef.current.observe(node);
        }
      }
    },
    [user?._id],
  );

  return { messageRef };
};
