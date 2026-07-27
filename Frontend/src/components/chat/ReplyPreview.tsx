import React from "react";
import type { Message } from "../../types";

interface ReplyPreviewProps {
  message: Message | null;
  onCancel: () => void;
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  message,
  onCancel,
}) => {
  if (!message) return null;

  const senderName =
    typeof message.senderId === "object" ? message.senderId.name : "User";

  const isAttachment = message.type !== "text";
  const typeLabel =
    message.type.charAt(0).toUpperCase() + message.type.slice(1);
  const previewText = isAttachment
    ? `${message.fileName || typeLabel}`
    : message.content;

  return (
    <div className="bg-surface-secondary border-l-4 border-primary px-4 py-2.5 rounded-t-xl flex justify-between items-center text-sm w-full mx-4 max-w-[calc(100%-2rem)] mb-0 border-b border-border shadow-sm">
      <div className="flex flex-col truncate pr-4 text-left w-full h-full justify-center">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-bold text-primary truncate leading-tight">
            Replying to {senderName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {isAttachment && (
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold uppercase shrink-0 tracking-wide">
              {typeLabel}
            </span>
          )}
          <span className="text-text-secondary truncate block w-full leading-tight focus:outline-none">
            {previewText}
          </span>
        </div>
      </div>
      <button
        onClick={onCancel}
        className="text-text-tertiary hover:text-danger p-1.5 rounded-full hover:bg-surface-hover transition-colors"
        aria-label="Cancel reply"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};
