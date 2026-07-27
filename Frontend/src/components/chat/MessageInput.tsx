import {
  useState,
  useRef,
  useEffect,
  lazy,
  Suspense,
  type JSX,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import { FileUploadButton } from "./FileUploadButton";
import {
  getCaseParticipants,
  uploadFileMessage,
} from "../../services/messageService";
import { formatFileSize } from "../../utils/fileUpload";
import {
  X,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Ban,
  Smile,
  Eye,
} from "lucide-react";
import { ReplyPreview } from "./ReplyPreview";
import type { Message } from "../../types";
import type { User } from "../../types";
import type { EmojiClickData } from "emoji-picker-react";

interface MessageInputProps {
  caseId: string;
  isArchived: boolean;
  isObserver?: boolean;
  replyToMessage?: Message | null;
  onCancelReply?: () => void;
  /** Called on every keystroke to emit typing events */
  onTyping?: () => void;
}

const MAX_ROWS = 5;
const LINE_HEIGHT_PX = 24;
const EMOJI_PICKER_MOBILE_WIDTH = "min(20rem, calc(100vw - 2rem))";
const EMOJI_PICKER_HEIGHT = 380;
const MAX_MENTION_SUGGESTIONS = 8;

const EmojiPicker = lazy(() => import("emoji-picker-react"));

const ArchivedNotice = (): JSX.Element => (
  <div className="flex flex-col items-center justify-center px-6 py-8 bg-surface-secondary border-t border-border gap-3 select-none">
    <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center text-danger animate-in fade-in zoom-in duration-300">
      <Ban size={28} strokeWidth={2.5} />
    </div>
    <div className="flex flex-col items-center gap-1 text-center">
      <h3 className="text-sm font-semibold text-text-primary">Case Archived</h3>
      <p className="text-xs text-text-tertiary">
        This case has been archived and is now read-only. No new messages can be
        sent.
      </p>
    </div>
  </div>
);

const ObserverNotice = (): JSX.Element => (
  <div className="flex flex-col items-center justify-center px-6 py-6 bg-surface-secondary border-t border-border gap-2 select-none">
    <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
      <Eye size={22} strokeWidth={2} />
    </div>
    <div className="flex flex-col items-center gap-1 text-center">
      <h3 className="text-sm font-semibold text-text-primary">Observer Access</h3>
      <p className="text-xs text-text-tertiary">
        You have Observer (Read-Only) access to this case. Messages and evidence cannot be posted or edited.
      </p>
    </div>
  </div>
);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveMentionQuery = (
  text: string,
  cursorIndex: number,
): { startIndex: number; query: string } | null => {
  const beforeCursor = text.slice(0, cursorIndex);
  const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/);
  if (!match) return null;

  const fullMatch = match[0];
  const query = match[2] ?? "";
  const startIndex =
    beforeCursor.length -
    fullMatch.length +
    (fullMatch.startsWith(" ") ? 1 : 0);

  return {
    startIndex,
    query,
  };
};

const getMentionableParticipants = (
  participants: User[],
  currentUserId: string | undefined,
): User[] =>
  participants.filter((participant) => participant._id !== currentUserId);

const getMentionedUserIdsFromText = (
  text: string,
  participants: User[],
): string[] => {
  if (!text.trim()) return [];

  const mentioned = participants.filter((participant) => {
    const escapedName = escapeRegExp(participant.name.trim());
    if (!escapedName) return false;
    const pattern = new RegExp(`(^|\\s)@${escapedName}(?=$|\\s|[.,!?;:])`, "i");
    return pattern.test(text);
  });

  return [...new Set(mentioned.map((participant) => participant._id))];
};

export const MessageInput = ({
  caseId,
  isArchived,
  isObserver,
  onTyping,
  replyToMessage,
  onCancelReply,
}: MessageInputProps): JSX.Element => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [participants, setParticipants] = useState<User[]>([]);
  const [activeMention, setActiveMention] = useState<{
    startIndex: number;
    query: string;
  } | null>(null);
  const [mentionSelectionIndex, setMentionSelectionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadParticipants = async () => {
      try {
        const list = await getCaseParticipants(caseId);
        if (!cancelled) {
          setParticipants(list);
        }
      } catch {
        if (!cancelled) {
          setParticipants([]);
        }
      }
    };

    void loadParticipants();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const mentionableParticipants = getMentionableParticipants(
    participants,
    user?._id,
  );
  const mentionSuggestions = activeMention
    ? mentionableParticipants
        .filter((participant) => {
          const query = activeMention.query.trim().toLowerCase();
          if (!query) return true;

          return (
            participant.name.toLowerCase().includes(query) ||
            participant.employeeId.toLowerCase().includes(query)
          );
        })
        .slice(0, MAX_MENTION_SUGGESTIONS)
    : [];

  useEffect(() => {
    setMentionSelectionIndex(0);
  }, [activeMention?.query]);

  const canSend =
    (content.trim().length > 0 || selectedFile !== null) &&
    isConnected &&
    socket !== null &&
    !isUploading;

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = MAX_ROWS * LINE_HEIGHT_PX;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  const insertEmojiAtCursor = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => `${prev}${emoji}`);
      return;
    }

    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const nextValue = `${content.slice(0, start)}${emoji}${content.slice(end)}`;
    const nextCursorPosition = start + emoji.length;

    setContent(nextValue);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        nextCursorPosition,
        nextCursorPosition,
      );
      resizeTextarea();
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    insertEmojiAtCursor(emojiData.emoji);
  };

  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (pickerContainerRef.current?.contains(target)) return;
      if (emojiButtonRef.current?.contains(target)) return;
      setIsEmojiPickerOpen(false);
      textareaRef.current?.focus();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isEmojiPickerOpen]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    setContent(nextValue);

    const cursorIndex = e.target.selectionStart ?? nextValue.length;
    setActiveMention(resolveMentionQuery(nextValue, cursorIndex));
    resizeTextarea();
    onTyping?.();
  };

  const insertMention = (participant: User) => {
    const textarea = textareaRef.current;
    if (!textarea || !activeMention) return;

    const cursorIndex = textarea.selectionStart ?? content.length;
    const beforeMention = content.slice(0, activeMention.startIndex);
    const afterMention = content.slice(cursorIndex);
    const mentionToken = `@${participant.name}`;
    const needsSpaceBefore =
      beforeMention.length > 0 && !beforeMention.endsWith(" ");
    const replacement = `${needsSpaceBefore ? " " : ""}${mentionToken} `;
    const nextValue = `${beforeMention}${replacement}${afterMention}`;
    const nextCursorPosition = (beforeMention + replacement).length;

    setContent(nextValue);
    setActiveMention(null);
    setMentionSelectionIndex(0);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        nextCursorPosition,
        nextCursorPosition,
      );
      resizeTextarea();
    });
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!socket || (!trimmed && !selectedFile)) return;

    const replyToId = replyToMessage?._id;
    const mentionedUserIds = getMentionedUserIdsFromText(
      trimmed,
      mentionableParticipants,
    );
    const mentionPayload =
      mentionedUserIds.length > 0 ? { mentionedUserIds } : {};

    if (selectedFile) {
      setIsUploading(true);
      setError(null);
      try {
        await uploadFileMessage(
          caseId,
          selectedFile,
          trimmed,
          replyToId,
          mentionedUserIds,
          (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(
                Math.round((progressEvent.loaded * 100) / progressEvent.total),
              );
            }
          },
        );
        setSelectedFile(null);
        setContent("");
        setActiveMention(null);
        setIsEmojiPickerOpen(false);
        onCancelReply?.();
      } catch (err: unknown) {
        const error = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to upload file",
        );
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
      return;
    }

    socket.emit("send_message", {
      caseId,
      content: trimmed,
      ...(replyToId && { replyToId }),
      ...mentionPayload,
    });

    setContent("");
    setActiveMention(null);
    setIsEmojiPickerOpen(false);
    onCancelReply?.();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (activeMention && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectionIndex(
          (prev) => (prev + 1) % mentionSuggestions.length,
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectionIndex((prev) =>
          prev === 0 ? mentionSuggestions.length - 1 : prev - 1,
        );
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const selected = mentionSuggestions[mentionSelectionIndex];
        if (selected) {
          insertMention(selected);
          return;
        }
      }
    }

    if (e.key === "Escape" && activeMention) {
      setActiveMention(null);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/"))
      return <ImageIcon size={20} className="text-primary" />;
    if (type.startsWith("video/"))
      return <Video size={20} className="text-primary" />;
    if (type.startsWith("audio/"))
      return <Music size={20} className="text-primary" />;
    return <FileText size={20} className="text-primary" />;
  };

  if (isArchived) return <ArchivedNotice />;
  if (isObserver) return <ObserverNotice />;

  return (
    <div className="bg-white border-t border-border flex flex-col pt-1">
      {replyToMessage && (
        <ReplyPreview
          message={replyToMessage}
          onCancel={() => onCancelReply?.()}
        />
      )}
      {error && (
        <div className="bg-danger/10 text-danger text-sm px-4 py-2 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="px-4 py-3 border-b border-border bg-surface-secondary flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-primary-lighter rounded-lg flex items-center justify-center shrink-0">
              {getFileIcon(selectedFile.type)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span
                className="text-sm font-medium text-text-primary truncate"
                title={selectedFile.name}
              >
                {selectedFile.name}
              </span>
              <span className="text-xs text-text-secondary">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            disabled={isUploading}
            className="p-2 text-text-tertiary hover:bg-surface-hover hover:text-danger rounded-full transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {isUploading && (
        <div className="h-1 bg-surface-tertiary w-full overflow-hidden shrink-0">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <div className="px-2 sm:px-4 py-2 sm:py-3 flex items-end gap-1.5 sm:gap-3 relative">
        {isEmojiPickerOpen && (
          <div
            ref={pickerContainerRef}
            className="absolute bottom-14 left-0 z-50 shadow-lg rounded-xl border border-border bg-white overflow-hidden transition duration-200 opacity-100 translate-y-0"
            style={{
              width: EMOJI_PICKER_MOBILE_WIDTH,
              maxWidth: `calc(100vw - 2rem)`,
            }}
          >
            <Suspense
              fallback={
                <div className="p-3 text-sm text-text-secondary">
                  Loading emojis...
                </div>
              }
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width="100%"
                height={EMOJI_PICKER_HEIGHT}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
              />
            </Suspense>
          </div>
        )}

        <button
          ref={emojiButtonRef}
          type="button"
          onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
          className="p-2 rounded-full hover:bg-surface-hover transition text-text-secondary shrink-0"
          aria-label="Open emoji picker"
        >
          <Smile size={20} />
        </button>

        <FileUploadButton
          onFileSelect={(file) => {
            setError(null);
            setSelectedFile(file);
          }}
          onError={(msg) => setError(msg)}
          disabled={isUploading}
        />

        <textarea
          ref={textareaRef}
          id="message-input"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isUploading}
          placeholder={
            selectedFile
              ? "Add a caption... (optional)"
              : "Type a message… (Enter to send, Shift+Enter for new line)"
          }
          rows={1}
          className="
            flex-1 resize-none overflow-y-auto
            bg-slate-50/70 border border-slate-200/90 rounded-2xl
            px-4 py-3.5 text-sm text-[#111827] min-h-[56px]
            placeholder:text-[#94A3B8] placeholder:font-normal
            focus:outline-none focus:border-[#6C4CF1] focus:bg-white focus:ring-4 focus:ring-[#6C4CF1]/12
            transition-all duration-[180ms] ease-in-out disabled:opacity-60 disabled:bg-slate-100
          "
          style={{
            lineHeight: `${LINE_HEIGHT_PX}px`,
            maxHeight: `${MAX_ROWS * LINE_HEIGHT_PX}px`,
          }}
          aria-label="Message input"
        />

        {activeMention && mentionSuggestions.length > 0 && (
          <ul
            className="absolute left-2 right-2 md:left-20 md:right-16 bottom-16 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-40"
            role="listbox"
            aria-label="Mention suggestions"
          >
            {mentionSuggestions.map((participant, index) => (
              <li key={participant._id}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(participant);
                  }}
                  className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                    index === mentionSelectionIndex ? "bg-purple-50 text-[#5B4CF3]" : ""
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {participant.name}
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    @{participant.employeeId}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          id="send-message-btn"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="
            shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
            bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-white shadow-md shadow-[#5B4CF3]/30
            hover:scale-105 active:scale-95 transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
