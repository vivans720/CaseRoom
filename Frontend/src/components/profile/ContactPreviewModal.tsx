import { useEffect, useRef, useCallback, type JSX } from "react";
import { createPortal } from "react-dom";
import type { User } from "../../types";
import { Avatar } from "../ui/Avatar";

interface ContactPreviewModalProps {
  isOpen: boolean;
  user: User | null;
  isOnline: boolean;
  lastSeenTime: string | null;
  onClose: () => void;
}

const formatLastSeen = (lastSeen: string | null): string => {
  if (!lastSeen) return "Last seen: unknown";
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Last seen: just now";
  if (diffMins < 60) return `Last seen: ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Last seen: ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Last seen: ${diffDays}d ago`;
};

export const ContactPreviewModal = ({
  isOpen,
  user,
  isOnline,
  lastSeenTime,
  onClose,
}: ContactPreviewModalProps): JSX.Element | null => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-preview-name"
      data-testid="contact-preview-backdrop"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl bg-surface overflow-hidden shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200"
        data-testid="contact-preview-card"
      >
        {/* Top Header Card Section */}
        <div className="bg-gradient-to-br from-primary/10 to-primary-light/5 py-8 flex flex-col items-center relative border-b border-border-light">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact info"
            title="Close"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-text-secondary hover:text-text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Large Prominent Avatar */}
          <Avatar
            name={user.name}
            size="xl"
            src={user.profilePictureUrl}
          />

          {/* Name & Status */}
          <h2
            id="contact-preview-name"
            className="text-xl font-bold text-text-primary mt-4 text-center px-4"
          >
            {user.name}
          </h2>

          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? "bg-success" : "bg-text-tertiary"}`}
              style={
                isOnline ? { backgroundColor: "var(--color-success)" } : undefined
              }
            />
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isOnline ? "text-success" : "text-text-tertiary"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Contact Details Fields */}
        <div className="p-6 space-y-4 bg-surface">
          {/* Employee ID */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
              Employee ID
            </span>
            <span className="text-sm font-medium text-text-primary">
              {user.employeeId || "—"}
            </span>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
              Email Address
            </span>
            <span className="text-sm font-medium text-text-primary truncate" title={user.email}>
              {user.email}
            </span>
          </div>

          {/* Phone */}
          {user.phone && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Phone Number
              </span>
              <span className="text-sm font-medium text-text-primary">
                {user.phone}
              </span>
            </div>
          )}

          {/* Last Seen / Status Info */}
          <div className="flex flex-col gap-0.5 pt-1 border-t border-border-light">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
              Status Description
            </span>
            <span className="text-xs text-text-secondary">
              {isOnline ? "Active now in conversation" : formatLastSeen(lastSeenTime)}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
