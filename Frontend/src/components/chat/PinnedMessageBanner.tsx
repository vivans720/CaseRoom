import { useState, useEffect, type JSX } from "react";
import type { Message } from "../../types";
import { getPinnedMessages } from "../../services/messageService";

interface PinnedMessageBannerProps {
  caseId: string;
  messages: Message[];
  onMessageClick: (messageId: string) => void;
}

export const PinnedMessageBanner = ({
  caseId,
  messages,
  onMessageClick,
}: PinnedMessageBannerProps): JSX.Element | null => {
  const [pinnedList, setPinnedList] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch initial pinned messages on mount or when caseId changes
  useEffect(() => {
    let active = true;
    getPinnedMessages(caseId).then((data) => {
      if (active) {
        setPinnedList(data);
        setCurrentIndex(0);
      }
    }).catch(console.error);
    return () => { active = false; };
  }, [caseId]);

  // Update pinnedList based on messages array changes (new pins/unpins from socket)
  useEffect(() => {
    // If a message in pinnedList was unpinned in the local `messages` state, remove it.
    // If a new message was pinned, add it.
    setPinnedList((prev) => {
      const currentPinned = messages.filter((m) => m.isPinned && !m.isDeleted);
      
      let updated = [...prev];
      
      // Remove unpinned
      updated = updated.filter((m) => currentPinned.some((cm) => cm._id === m._id) || m.isPinned); // wait, if not in currentPinned, it might just not be loaded in `messages` yet.
      
      // We should only remove if we KNOW it was unpinned.
      updated = updated.filter((m) => {
        const found = messages.find((cm) => cm._id === m._id);
        if (found && (!found.isPinned || found.isDeleted)) return false;
        return true;
      });

      // Add newly pinned
      currentPinned.forEach((cm) => {
        if (!updated.find((m) => m._id === cm._id)) {
          updated.unshift(cm); // prepend latest
        }
      });

      // Sort by pinnedAt descending
      updated.sort((a, b) => {
        const timeA = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const timeB = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return timeB - timeA;
      });

      return updated;
    });
  }, [messages]);

  if (pinnedList.length === 0) return null;

  // Ensure index is valid
  const safeIndex = currentIndex >= pinnedList.length ? 0 : currentIndex;
  const currentPin = pinnedList[safeIndex];

  const handleBannerClick = () => {
    onMessageClick(currentPin._id);
    
    // Cycle to the next pin
    setCurrentIndex((prev) => (prev + 1) % pinnedList.length);
  };

  const senderName = typeof currentPin.senderId === "object" 
    ? (currentPin.senderId as any).name 
    : "Unknown";

  const contentText = currentPin.type !== "text" 
    ? (currentPin.fileName || `${currentPin.type} File`) 
    : currentPin.content;

  return (
    <div 
      onClick={handleBannerClick}
      className="bg-surface-secondary border-b border-border px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-surface-hover transition-colors"
    >
      <div className="text-primary opacity-80 shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M16 3H8c-1.1 0-2 .9-2 2v8l-2 3v2h7v5l1 1 1-1v-5h7v-2l-2-3V5c0-1.1-.9-2-2-2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-center w-full gap-2">
          <span className="text-xs font-semibold text-text-primary truncate">Pinned Message {pinnedList.length > 1 ? `(${safeIndex + 1}/${pinnedList.length})` : ""}</span>
          <span className="text-[10px] text-text-tertiary truncate">{senderName}</span>
        </div>
        <span className="text-xs text-text-secondary truncate mt-0.5">{contentText}</span>
      </div>
    </div>
  );
};
