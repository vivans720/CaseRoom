import { useEffect, useRef, useState, type JSX, type ReactNode } from "react";
import type { Message, User, Reaction } from "../../types";
import { Avatar } from "../ui/Avatar";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { useMeeting } from "../../hooks/useMeeting";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  /** Hide sender name/avatar when consecutive messages from same sender */
  showSender: boolean;
  onReply?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onPin?: (message: Message) => void;
  onUnpin?: (message: Message) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  currentUserId: string;
  isArchived?: boolean;
  /** Callback ref for IntersectionObserver */
  measureRef?: (node: HTMLDivElement | null) => void;
  onShowContactPreview?: (user: User) => void;
}

const formatTime = (dateStr: string): string => {
  return new Date(dateStr)
    .toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
};

const ReadReceipt = ({
  isRead,
  isOwn,
}: {
  isRead: boolean;
  isOwn: boolean;
}) => {
  if (!isOwn) return null;
  return (
    <svg
      viewBox="0 0 16 15"
      width="16"
      height="15"
      className={isRead ? "text-[#34B7F1]" : "text-white/60"}
    >
      <path
        fill="currentColor"
        d="M15.01 3.316l-.426-.409a.412.412 0 0 0-.581 0l-5.875 5.642-2.193-2.106a.41.41 0 0 0-.58 0l-.428.41a.412.412 0 0 0 0 .581l2.77 2.66c.219.21.571.21.79 0l6.523-6.262a.412.412 0 0 0 0-.536zm-5.01 0l-.426-.409a.412.412 0 0 0-.581 0l-5.875 5.642-2.193-2.106a.41.41 0 0 0-.58 0l-.428.41a.412.412 0 0 0 0 .581l2.77 2.66c.219.21.571.21.79 0l6.523-6.262a.412.412 0 0 0 0-.536z"
      />
    </svg>
  );
};

const getSenderName = (senderId: string | User): string => {
  if (typeof senderId === "object" && senderId !== null) {
    return senderId.name;
  }
  return "Unknown";
};

const getSenderAvatarSrc = (senderId: string | User): string | null => {
  if (typeof senderId === "object" && senderId !== null) {
    return senderId.profilePictureUrl ?? null;
  }
  return null;
};

const getMentionUsers = (mentions?: Array<string | User>): User[] => {
  if (!mentions || mentions.length === 0) return [];

  return mentions.filter(
    (mention): mention is User =>
      typeof mention === "object" && mention !== null && Boolean(mention.name),
  );
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderMentionedText = (
  text: string,
  mentions: Array<string | User> | undefined,
  isOwn: boolean,
): ReactNode[] => {
  const mentionUsers = getMentionUsers(mentions);
  if (!text || mentionUsers.length === 0) return [text];

  const mentionNames = mentionUsers
    .map((user) => user.name.trim())
    .filter((name) => name.length > 0)
    .sort((a, b) => b.length - a.length);

  if (mentionNames.length === 0) return [text];

  const pattern = mentionNames.map(escapeRegExp).join("|");
  const mentionRegex = new RegExp(
    `(^|\\s)@(${pattern})(?=$|\\s|[.,!?;:])`,
    "gi",
  );

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match = mentionRegex.exec(text);

  while (match !== null) {
    const fullMatch = match[0];
    const leadingWhitespace = match[1] || "";
    const name = match[2] || "";
    const leadingLength = leadingWhitespace.length;
    const mentionStart = match.index + leadingLength;

    if (mentionStart > lastIndex) {
      nodes.push(text.slice(lastIndex, mentionStart));
    }

    nodes.push(
      <span
        key={`mention-${matchIndex}`}
        className={`font-semibold ${isOwn ? "text-white" : "text-primary"}`}
      >
        @{name}
      </span>,
    );

    lastIndex = mentionStart + `@${name}`.length;
    matchIndex += 1;
    match = mentionRegex.exec(text);

    if (fullMatch.length === 0) {
      break;
    }
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
};

const DeletedMessage = (): JSX.Element => (
  <p className="italic text-text-tertiary text-sm select-none">
    🚫 This message was deleted.
  </p>
);

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "kB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileExtension = (fileName?: string): string => {
  if (!fileName) return "FILE";
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
};

export const handleFileDownload = async (
  e: React.MouseEvent,
  url?: string,
  fileName?: string,
) => {
  e.preventDefault();
  e.stopPropagation();
  if (!url) return;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName || "file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error("File download failed:", error);
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const FileAttachment = ({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}): JSX.Element => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { fileUrl, fileName, fileSize, type } = message;
  const extension = getFileExtension(fileName);
  const sizeStr = formatFileSize(fileSize);
  const caseIdStr =
    typeof message.caseId === "object" ? message.caseId._id : message.caseId;

  if (!fileUrl) return <span className="text-xs italic">Attachment unavailable</span>;

  const senderName = getSenderName(message.senderId);

  if (type === "image") {
    return (
      <>
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsPreviewOpen(true);
          }}
          className="block relative rounded-lg overflow-hidden border border-black/5 hover:opacity-95 transition-opacity cursor-pointer group"
        >
          <img
            src={fileUrl}
            alt={fileName || "Image"}
            className="max-w-full h-auto max-h-75 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5">
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
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Preview & Annotate</span>
          </div>
        </div>
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          fileUrl={fileUrl}
          fileName={fileName}
          caseId={caseIdStr}
          messageId={message._id}
          fileMimeType={message.fileMimeType}
          senderName={senderName}
        />
      </>
    );
  }

  return (
    <>
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsPreviewOpen(true);
        }}
        className={`
          flex items-center gap-3 p-2.5 rounded-lg border transition-colors no-underline cursor-pointer group
          ${
            isOwn
              ? "bg-black/10 border-white/10 hover:bg-black/20 text-white"
              : "bg-black/5 border-black/5 hover:bg-black/10 text-text-primary"
          }
        `}
      >
        <div
          className={`p-2 rounded-md ${isOwn ? "bg-white/20" : "bg-primary/10 text-primary"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold truncate">
            {fileName || "Attachment"}
          </span>
          <span className={`text-[11px] opacity-70 uppercase font-medium mt-0.5`}>
            {sizeStr} • {extension}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-1 opacity-70 group-hover:opacity-100">
          <span className="text-[11px] font-medium hidden sm:inline">Preview & Annotate</span>
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
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
      </div>
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={fileUrl}
        fileName={fileName}
        caseId={caseIdStr}
        messageId={message._id}
        fileMimeType={message.fileMimeType}
        senderName={senderName}
      />
    </>
  );
};

const MeetingCard = ({
  message,
}: {
  message: Message;
}): JSX.Element => {
  const { joinMeeting, isInMeeting, meetingCaseId } = useMeeting();
  const caseIdStr =
    typeof message.caseId === "object" ? message.caseId._id : message.caseId;
  const senderName = getSenderName(message.senderId);
  const isInThisMeeting = isInMeeting && meetingCaseId === caseIdStr;

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 my-1 min-w-[240px]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-white shadow-md">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-extrabold tracking-tight">Video Meeting</span>
          <span className="text-[11px] opacity-75 truncate">{senderName} started a call</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void joinMeeting(caseIdStr);
        }}
        disabled={isInThisMeeting}
        className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all shadow-xs ${
          isInThisMeeting
            ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 cursor-default"
            : "bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-white hover:opacity-90 active:scale-95"
        }`}
      >
        {isInThisMeeting ? "● In Meeting" : "Join Meeting"}
      </button>
    </div>
  );
};

const MessageContent = ({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}): JSX.Element => {
  if (message.isDeleted) return <DeletedMessage />;
  if (message.type === "meeting_started") {
    return <MeetingCard message={message} />;
  }
  if (message.type !== "text") {
    const caption = message.content?.trim();
    return (
      <div className="flex flex-col gap-2">
        {caption && (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {renderMentionedText(caption, message.mentions, isOwn)}
          </p>
        )}
        <FileAttachment message={message} isOwn={isOwn} />
      </div>
    );
  }
  return (
    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
      {renderMentionedText(message.content, message.mentions, isOwn)}
    </p>
  );
};

const ReplySnippet = ({
  replyTo,
  isOwn,
}: {
  replyTo: Message | string | null;
  isOwn: boolean;
}): JSX.Element | null => {
  if (!replyTo || typeof replyTo === "string") return null;

  const senderName = getSenderName(replyTo.senderId);
  const isDeleted = replyTo.isDeleted;

  const content = isDeleted
    ? "Original message was deleted"
    : replyTo.type !== "text"
      ? replyTo.fileName ||
        `${replyTo.type.charAt(0).toUpperCase() + replyTo.type.slice(1)} File`
      : replyTo.content;

  return (
    <div
      className={`
      rounded-lg px-2.5 py-1.5 mb-1.5 text-xs border-l-4 overflow-hidden cursor-pointer select-none
      ${isOwn ? "bg-black/10 border-white/40" : "bg-black/5 border-primary/60"}
    `}
    >
      <div
        className={`font-bold truncate mb-0.5 ${isOwn ? "text-white" : "text-primary/90"}`}
      >
        {senderName}
      </div>
      <div
        className={`truncate ${isOwn ? "text-white" : "text-text-secondary"} font-medium`}
      >
        {content}
      </div>
    </div>
  );
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ReactionPicker = ({
  onSelect,
  currentReactions,
  currentUserId,
  isOwn,
  onMouseEnter,
  onMouseLeave,
}: {
  onSelect: (emoji: string) => void;
  currentReactions: Reaction[];
  currentUserId: string;
  isOwn: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) => {
  return (
    <div
      data-testid="reaction-picker"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        absolute z-20 bottom-full mb-2 inline-flex w-auto items-center gap-2 p-1.5 px-3 bg-[#1F1F1F]/90 backdrop-blur-md shadow-md rounded-full whitespace-nowrap
        animate-in fade-in zoom-in-90 duration-150 ease-out
        ${isOwn ? "right-0" : "left-0"}
    `}
    >
      {REACTION_EMOJIS.map((emoji) => {
        const hasReacted = currentReactions
          .find((r) => r.emoji === emoji)
          ?.userIds.includes(currentUserId);
        return (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-lg ${hasReacted ? "bg-white/20" : ""}`}
          >
            {emoji}
          </button>
        );
      })}
      <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/60">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
};

const ReactionDisplay = ({
  reactions,
  currentUserId,
  onToggle,
  isOwn,
}: {
  reactions: Reaction[];
  currentUserId: string;
  onToggle: (emoji: string) => void;
  isOwn: boolean;
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div
      className={`
        absolute -bottom-0.5 z-10 flex flex-wrap gap-1.5
        ${isOwn ? "right-2" : "left-2"}
    `}
    >
      {reactions.map((reaction) => {
        const hasReacted = reaction.userIds.includes(currentUserId);
        return (
          <button
            key={reaction.emoji}
            onClick={() => onToggle(reaction.emoji)}
            className={`
              flex items-center justify-center gap-1 px-2.5 py-1 rounded-full border shadow-sm transition-all duration-150
              ${
                hasReacted
                  ? "bg-primary/15 border-primary/20 text-primary"
                  : "bg-white border-black/5 text-zinc-800 hover:shadow-sm dark:bg-white dark:border-black/10 dark:text-zinc-800"
              }
            `}
          >
            <span className="text-[15px] leading-none">{reaction.emoji}</span>
            {reaction.userIds.length > 1 && (
              <span className="text-xs font-semibold opacity-80 leading-none">
                {reaction.userIds.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface MessageActionButtonsProps {
  message: Message;
  isOwn: boolean;
  isArchived: boolean;
  copied: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onPin?: (message: Message) => void;
  onUnpin?: (message: Message) => void;
  openPicker: () => void;
  schedulePickerClose: () => void;
  togglePinnedPicker: () => void;
  handleCopy: () => void;
}

const MessageActionButtons = ({
  message,
  isOwn,
  isArchived,
  copied,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  openPicker,
  schedulePickerClose,
  togglePinnedPicker,
  handleCopy,
}: MessageActionButtonsProps): JSX.Element | null => {
  if (message.isDeleted) return null;

  return (
    <div className="flex items-center gap-1 sm:gap-2 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100">
      {(onPin || onUnpin) && !isArchived && (
        <button
          title={message.isPinned ? "Unpin message" : "Pin message"}
          onClick={() => (message.isPinned ? onUnpin?.(message) : onPin?.(message))}
          className={`text-text-tertiary hover:text-primary rounded-full p-1 ${message.isPinned ? "text-primary bg-primary/10" : ""}`}
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
            <line x1="12" y1="17" x2="12" y2="22"></line>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 1 0-6 0v4.68a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
          </svg>
        </button>
      )}
      {onReply && (
        <button
          title="Reply"
          onClick={() => onReply(message)}
          className="text-text-tertiary hover:text-primary rounded-full p-1"
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
            <polyline points="9 17 4 12 9 7"></polyline>
            <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
          </svg>
        </button>
      )}
      {!isArchived && (
        <button
          title="React"
          data-testid="reaction-trigger"
          onMouseEnter={openPicker}
          onMouseLeave={schedulePickerClose}
          onClick={togglePinnedPicker}
          className="text-text-tertiary hover:text-primary rounded-full p-1"
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
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>
      )}
      {message.content && (
        <button
          title={copied ? "Copied" : "Copy message"}
          onClick={handleCopy}
          className="text-text-tertiary hover:text-primary rounded-full p-1"
        >
          {copied ? (
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
              className="text-emerald-500 animate-in zoom-in-50 duration-200"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
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
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
        </button>
      )}
      {isOwn && onEdit && !isArchived && (
        <button
          title="Edit message"
          onClick={() => onEdit(message)}
          className="text-text-tertiary hover:text-primary rounded-full p-1"
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
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
      {isOwn && onDelete && !isArchived && (
        <button
          title="Delete for everyone"
          onClick={() => onDelete(message)}
          className="text-text-tertiary hover:text-danger rounded-full p-1"
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
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

export const MessageBubble = ({
  message,
  isOwn,
  showSender,
  onReply,
  onDelete,
  onEdit,
  onPin,
  onUnpin,
  onToggleReaction,
  currentUserId,
  isArchived = false,
  measureRef,
  onShowContactPreview,
}: MessageBubbleProps): JSX.Element => {
  const [showPicker, setShowPicker] = useState(false);
  const [isPickerPinned, setIsPickerPinned] = useState(false);
  const [copied, setCopied] = useState(false);
  const closePickerTimeoutRef = useRef<number | null>(null);
  const time = formatTime(message.createdAt);
  const senderName = getSenderName(message.senderId);
  const senderAvatarSrc = getSenderAvatarSrc(message.senderId);
  const isRead = message.readBy && message.readBy.length > 0;
  const hasReactions = message.reactions && message.reactions.length > 0;

  const clearClosePickerTimeout = () => {
    if (closePickerTimeoutRef.current !== null) {
      window.clearTimeout(closePickerTimeoutRef.current);
      closePickerTimeoutRef.current = null;
    }
  };

  const openPicker = () => {
    if (isArchived || message.isDeleted) return;
    clearClosePickerTimeout();
    setShowPicker(true);
  };

  const pinPicker = () => {
    if (isArchived || message.isDeleted) return;
    clearClosePickerTimeout();
    setIsPickerPinned(true);
    setShowPicker(true);
  };

  const togglePinnedPicker = () => {
    if (isArchived || message.isDeleted) return;

    if (showPicker && isPickerPinned) {
      clearClosePickerTimeout();
      setIsPickerPinned(false);
      setShowPicker(false);
      return;
    }

    pinPicker();
  };

  const schedulePickerClose = () => {
    if (isPickerPinned) return;
    clearClosePickerTimeout();
    closePickerTimeoutRef.current = window.setTimeout(() => {
      setShowPicker(false);
    }, 140);
  };

  useEffect(() => {
    return () => {
      clearClosePickerTimeout();
    };
  }, []);

  const handleToggleEmoji = (emoji: string) => {
    onToggleReaction?.(message._id, emoji);
    clearClosePickerTimeout();
    setIsPickerPinned(false);
    setShowPicker(false);
  };

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = message.content;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div
      ref={measureRef}
      data-message-id={message._id}
      data-unread={!isRead}
      data-own={isOwn}
      data-testid="message-bubble-row"
      className={`relative group flex animate-in fade-in duration-200 flex-col ${isOwn ? "items-end" : "items-start"} ${hasReactions ? "mb-5" : "mb-1"}`}
    >
      <div
        className={`flex items-end gap-2 w-full ${isOwn ? "justify-end" : "justify-start"}`}
      >
        {!isOwn && (
          <div className="w-8 shrink-0 self-end">
            {showSender ? (
              <Avatar
                name={senderName}
                size="sm"
                src={senderAvatarSrc}
                onClick={
                  onShowContactPreview &&
                  typeof message.senderId === "object" &&
                  message.senderId !== null
                    ? () => onShowContactPreview(message.senderId as User)
                    : undefined
                }
              />
            ) : (
              <div className="w-8" />
            )}
          </div>
        )}

        <div className={`flex flex-col gap-0.5 max-w-[85%] sm:max-w-[480px] relative`}>
          {!isOwn && showSender && (
            <span className="text-xs font-medium text-text-secondary ml-1">
              {senderName}
            </span>
          )}

          <div
            className={`flex items-end gap-2 ${isOwn ? "flex-row" : "flex-row-reverse max-w-full"}`}
          >
            <MessageActionButtons
              message={message}
              isOwn={isOwn}
              isArchived={isArchived}
              copied={copied}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onPin={onPin}
              onUnpin={onUnpin}
              openPicker={openPicker}
              schedulePickerClose={schedulePickerClose}
              togglePinnedPicker={togglePinnedPicker}
              handleCopy={handleCopy}
            />

            <div
              data-testid="message-bubble"
              className="relative inline-flex flex-col"
            >
              <div
                className={`
                  msg-bubble px-3.5 py-2 shadow-xs rounded-2xl
                  ${showSender ? (isOwn ? "rounded-tr-none msg-bubble-tail-own" : "rounded-tl-none msg-bubble-tail-received") : ""}
                  ${message.isDeleted ? "bg-slate-100 text-slate-400" : isOwn ? "bg-gradient-to-r from-[#5B4CF3] to-[#7B3BF8] text-white" : "bg-slate-100/90 text-slate-900 border border-slate-200/60"}
                `}
              >
                <div className="flex flex-col gap-0.5 min-w-15">
                  {message.isPinned && !message.isDeleted && (
                    <div className="flex items-center gap-1 text-[10px] opacity-80 font-medium mb-0.5 border-b border-black/10 dark:border-white/10 pb-0.5">
                      <span>📌 Pinned Message</span>
                    </div>
                  )}
                  {message.replyTo && (
                    <ReplySnippet
                      replyTo={message.replyTo as Message}
                      isOwn={isOwn}
                    />
                  )}
                  <MessageContent message={message} isOwn={isOwn} />
                  <div className="flex items-center gap-1 self-end mt-1 -mb-1">
                    {message.editedAt && !message.isDeleted && (
                      <span className="text-[10px] opacity-70 font-medium">
                        Edited
                      </span>
                    )}
                    <span className="text-[10px] opacity-70 uppercase font-medium">
                      {time}
                    </span>
                    {!message.isDeleted && (
                      <ReadReceipt isRead={isRead} isOwn={isOwn} />
                    )}
                  </div>
                </div>
              </div>

              {showPicker && !message.isDeleted && !isArchived && (
                <ReactionPicker
                  onSelect={handleToggleEmoji}
                  currentReactions={message.reactions || []}
                  currentUserId={currentUserId}
                  isOwn={isOwn}
                  onMouseEnter={openPicker}
                  onMouseLeave={schedulePickerClose}
                />
              )}

              {!message.isDeleted && (
                <ReactionDisplay
                  reactions={message.reactions || []}
                  currentUserId={currentUserId}
                  onToggle={handleToggleEmoji}
                  isOwn={isOwn}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
