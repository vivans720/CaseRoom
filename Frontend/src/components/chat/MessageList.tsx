import { useRef, useEffect, useCallback, type JSX } from "react";
import type { Message, User } from "../../types";
import { MessageBubble } from "./MessageBubble";
import { Spinner } from "../ui/Spinner";
import { MessageListSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { useReadReceipts } from "../../hooks/useReadReceipts";

interface MessageListProps {
  caseId: string;
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  currentUserId: string;
  onReply?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onPin?: (message: Message) => void;
  onUnpin?: (message: Message) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  isArchived?: boolean;
  scrollToMessageId?: string | null;
  onShowContactPreview?: (user: User) => void;
}

// ─── Date separator helpers ───────────────────────────────────────────────────

const getDateKey = (dateStr: string): string =>
  new Date(dateStr).toDateString();

const formatDateSeparator = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const DateSeparator = ({ label }: { label: string }): JSX.Element => (
  <div className="flex items-center gap-3 my-6 py-1 px-6 select-none">
    <div className="flex-1 h-px bg-slate-200/80" />
    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-3.5 py-1 rounded-full border border-slate-200/90 shadow-2xs">
      {label}
    </span>
    <div className="flex-1 h-px bg-slate-200/80" />
  </div>
);

const NewMessagesDivider = (): JSX.Element => (
  <div className="flex items-center gap-3 my-4 px-6 select-none" data-testid="new-messages-divider">
    <div className="flex-1 h-px bg-rose-300" />
    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-0.5 rounded-full border border-rose-200 uppercase tracking-wider">
      New Messages
    </span>
    <div className="flex-1 h-px bg-rose-300" />
  </div>
);

// ─── Scroll helpers ───────────────────────────────────────────────────────────

const NEAR_BOTTOM_THRESHOLD_PX = 100;

const isNearBottom = (el: HTMLElement): boolean =>
  el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD_PX;

// ─── Sender grouping helper ───────────────────────────────────────────────────

const getSenderId = (msg: Message): string => {
  if (typeof msg.senderId === "object" && msg.senderId !== null) {
    return msg.senderId._id;
  }
  return msg.senderId;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MessageList = ({
  caseId,
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  loadMore,
  currentUserId,
  onReply,
  onDelete,
  onEdit,
  onPin,
  onUnpin,
  onToggleReaction,
  isArchived = false,
  scrollToMessageId,
  onShowContactPreview,
}: MessageListProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const atBottomRef = useRef(true);

  const { messageRef } = useReadReceipts(caseId);

  // Track whether user is near the bottom before a re-render
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    atBottomRef.current = isNearBottom(el);
  }, []);

  // Auto-scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isLoading) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  // Preserve scroll position after prepending older messages
  useEffect(() => {
    if (!isLoadingMore) {
      const el = containerRef.current;
      if (!el) return;
      const scrollDiff = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop += scrollDiff;
    }
  }, [isLoadingMore]);

  // IntersectionObserver on the sentinel div to trigger loadMore
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          // Capture scrollHeight before prepend
          if (containerRef.current) {
            prevScrollHeightRef.current = containerRef.current.scrollHeight;
          }
          loadMore();
        }
      },
      { root: containerRef.current, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const lastScrolledIdRef = useRef<string | null>(null);

  // Handle programmatic scrolling to a specific message
  useEffect(() => {
    // If scrollToMessageId is null, reset the ref so we can scroll to it again if requested
    if (!scrollToMessageId) {
      lastScrolledIdRef.current = null;
      return;
    }

    if (!isLoading && lastScrolledIdRef.current !== scrollToMessageId) {
      const scrollIntoView = (retryCount = 0) => {
        const el = document.getElementById(`msg-${scrollToMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });

          // Add a temporary highlight class
          el.classList.add("animate-message-highlight");
          setTimeout(() => {
            el.classList.remove("animate-message-highlight");
          }, 2000);

          lastScrolledIdRef.current = scrollToMessageId;
          return true;
        }

        if (retryCount < 5) {
          setTimeout(() => scrollIntoView(retryCount + 1), 100 * (retryCount + 1));
        }
        return false;
      };

      scrollIntoView();
    }
  }, [scrollToMessageId, isLoading, messages]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-surface-secondary">
        <MessageListSkeleton />
      </div>
    );
  }

  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-secondary px-4">
        <EmptyState
          title="No messages yet"
          description="Say hello and start the conversation."
        />
      </div>
    );
  }

  // Find index of first unread message from someone else
  const firstUnreadIndex = messages.findIndex(
    (msg) =>
      getSenderId(msg) !== currentUserId &&
      (!msg.readBy || !msg.readBy.some((r) => r.userId === currentUserId)),
  );

  // Build rendered items with date separators and grouped sender logic
  const renderedItems: JSX.Element[] = [];
  let lastDateKey = "";

  messages.forEach((msg, index) => {
    const dateKey = getDateKey(msg.createdAt);
    if (dateKey !== lastDateKey) {
      renderedItems.push(
        <DateSeparator
          key={`sep-${dateKey}`}
          label={formatDateSeparator(msg.createdAt)}
        />,
      );
      lastDateKey = dateKey;
    }

    // Insert New Messages divider before first unread message
    if (index === firstUnreadIndex && firstUnreadIndex !== -1) {
      renderedItems.push(<NewMessagesDivider key="new-msgs-divider" />);
    }

    const isOwn = getSenderId(msg) === currentUserId;

    // Show sender info only when the previous message is from a different sender
    // or from > 5 minutes apart
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const sameWindow =
      prevMsg !== null &&
      getDateKey(prevMsg.createdAt) === dateKey &&
      Math.abs(
        new Date(msg.createdAt).getTime() -
          new Date(prevMsg.createdAt).getTime(),
      ) < 300_000;
    const sameSender =
      prevMsg !== null && getSenderId(prevMsg) === getSenderId(msg);

    const showSender = !(sameSender && sameWindow);

    renderedItems.push(
      <div
        key={msg._id}
        id={`msg-${msg._id}`}
        className="transition-colors duration-500 rounded-xl px-1"
      >
        <MessageBubble
          message={msg}
          isOwn={isOwn}
          showSender={showSender}
          onReply={onReply}
          onDelete={onDelete}
          onEdit={onEdit}
          onPin={onPin}
          onUnpin={onUnpin}
          onToggleReaction={onToggleReaction}
          currentUserId={currentUserId}
          isArchived={isArchived}
          measureRef={messageRef}
          onShowContactPreview={onShowContactPreview}
        />
      </div>,
    );
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-[#FAFBFF] px-4 pb-4"
    >
      {/* Top sentinel — triggers loadMore when scrolled to top */}
      <div ref={sentinelRef} className="h-1" />

      {/* Spinner while loading older pages */}
      {isLoadingMore && (
        <div className="flex justify-center py-3">
          <Spinner size="sm" />
        </div>
      )}

      {/* No more pages indicator */}
      {!hasMore && messages.length > 0 && (
        <p className="text-center text-xs text-text-tertiary py-3">
          — Beginning of conversation —
        </p>
      )}

      {renderedItems}
    </div>
  );
};
