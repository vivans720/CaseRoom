import { useEffect, useState, useRef, type JSX } from "react";
import { useParams } from "react-router-dom";
import { useCaseSocket } from "../../hooks/useCaseSocket";
import { useMessages } from "../../hooks/useMessages";
import { useDashboardPanel } from "../../hooks/useDashboardPanel";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import { useTypingIndicator } from "../../hooks/useTypingIndicator";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { PinnedMessageBanner } from "./PinnedMessageBanner";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { MeetingRoom } from "../meeting/MeetingRoom";
import { MeetingPiP } from "../meeting/MeetingPiP";
import { useMeeting } from "../../hooks/useMeeting";
import type { Message } from "../../types";
import { getCaseParticipants } from "../../services/caseService";
import { pinMessage, unpinMessage } from "../../services/messageService";

interface MessageDeletedPayload {
  messageId: string;
  caseId: string;
  deletedBy: string;
  deletedAt: string;
}

const getCaseIdFromMessage = (message: Message): string => {
  if (typeof message.caseId === "object" && message.caseId !== null) {
    return message.caseId._id;
  }
  return message.caseId;
};

export const ChatView = (): JSX.Element => {
  const { caseId } = useParams<{ caseId: string }>();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { isInMeeting, viewMode, meetingCaseId } = useMeeting();
  const {
    activePanel,
    togglePanel,
    jumpToMessageId,
    setJumpToMessageId,
    onShowContactPreview,
  } = useDashboardPanel();

  const [activeReplyMessage, setActiveReplyMessage] = useState<Message | null>(
    null,
  );
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(
    null,
  );
  const [isObserver, setIsObserver] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  useEffect(() => {
    if (!caseId || !user) return;
    getCaseParticipants(caseId)
      .then((pts) => {
        const currentUserParticipant = pts.find((p) => p._id === user._id);
        setIsObserver(currentUserParticipant?.role === "Observer");
      })
      .catch(() => {
        setIsObserver(false);
      });
  }, [caseId, user]);

  // Join / leave the socket room
  useCaseSocket(caseId);

  // Message state + real-time handlers
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    appendMessage,
    updateDeletedMessage,
    updateEditedMessage,
    updateMessageRead,
    updateMessageReactions,
    updatePinnedMessage,
    updateUnpinnedMessage,
    loadUntilMessage,
  } = useMessages(caseId);

  // Online presence for this case
  const { onlineUserIds } = usePresence(caseId);

  // Typing indicator state + notifier
  const { typingUserNames, notifyTyping } = useTypingIndicator(caseId);

  // Listen for real-time socket events
  useEffect(() => {
    if (!socket || !caseId) return;

    const handleNewMessage = (msg: Message) => {
      appendMessage(msg);
    };

    const handleMessageDeleted = (payload: MessageDeletedPayload) => {
      if (payload.caseId === caseId) {
        updateDeletedMessage({
          messageId: payload.messageId,
          deletedAt: payload.deletedAt,
        });
      }
    };

    interface MessageReadPayload {
      caseId: string;
      messageId: string;
      readBy: { userId: string; readAt: string }[];
    }

    const handleMessageRead = (payload: MessageReadPayload) => {
      updateMessageRead(payload);
    };

    const handleMessageEdited = (message: Message) => {
      if (getCaseIdFromMessage(message) === caseId) {
        updateEditedMessage(message);
      }
    };

    interface MessageReactionsPayload {
      caseId: string;
      messageId: string;
      reactions: { emoji: string; userIds: string[] }[];
    }

    const handleReactionUpdated = (payload: MessageReactionsPayload) => {
      if (payload.caseId === caseId) {
        updateMessageReactions({
          messageId: payload.messageId,
          reactions: payload.reactions,
        });
      }
    };

    const handleMessagePinned = (payload: { caseId: string; message: Message }) => {
      if (payload.caseId === caseId) {
        updatePinnedMessage(payload.message);
      }
    };

    const handleMessageUnpinned = (payload: { caseId: string; messageId: string }) => {
      if (payload.caseId === caseId) {
        updateUnpinnedMessage(payload.messageId);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_read", handleMessageRead);
    socket.on("reaction_updated", handleReactionUpdated);
    socket.on("message_pinned", handleMessagePinned);
    socket.on("message_unpinned", handleMessageUnpinned);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_read", handleMessageRead);
      socket.off("reaction_updated", handleReactionUpdated);
      socket.off("message_pinned", handleMessagePinned);
      socket.off("message_unpinned", handleMessageUnpinned);
    };
  }, [
    socket,
    caseId,
    appendMessage,
    updateDeletedMessage,
    updateEditedMessage,
    updateMessageRead,
    updateMessageReactions,
    updatePinnedMessage,
    updateUnpinnedMessage,
  ]);

  // The archived status is updated via ChatHeader's onCaseLoaded callback.
  // We initialize it as false and update when case data is fetched.

  const handleDeleteConfirm = () => {
    if (messageToDelete && socket) {
      socket.emit("delete_message", {
        caseId: messageToDelete.caseId,
        messageId: messageToDelete._id,
      });
      setMessageToDelete(null);
    }
  };

  const handleOpenEdit = (message: Message) => {
    setMessageToEdit(message);
    setEditDraft(message.content ?? "");
  };

  const handleCloseEdit = () => {
    setMessageToEdit(null);
    setEditDraft("");
  };

  const handleEditConfirm = () => {
    if (!socket || !messageToEdit || isArchived) return;

    const targetCaseId = getCaseIdFromMessage(messageToEdit);
    socket.emit("edit_message", {
      caseId: targetCaseId,
      messageId: messageToEdit._id,
      content: editDraft,
    });
    handleCloseEdit();
  };

  const handlePin = async (message: Message) => {
    if (!caseId) return;
    try {
      await pinMessage(caseId, message._id);
    } catch (error) {
      console.error("Failed to pin message:", error);
    }
  };

  const handleUnpin = async (message: Message) => {
    if (!caseId) return;
    try {
      await unpinMessage(caseId, message._id);
    } catch (error) {
      console.error("Failed to unpin message:", error);
    }
  };

  const loadUntilMessageRef = useRef(loadUntilMessage);
  useEffect(() => {
    loadUntilMessageRef.current = loadUntilMessage;
  }, [loadUntilMessage]);

  useEffect(() => {
    if (!jumpToMessageId || isLoading) return;

    let cancelled = false;

    const jumpToMessage = async (): Promise<void> => {
      const success = await loadUntilMessageRef.current(jumpToMessageId);

      if (cancelled) return;

      if (success) {
        // Reset scrollToMessageId to null first, then set it to the target ID
        // so that clicking the same message twice will still trigger the effect in MessageList.
        setScrollToMessageId(null);
        setTimeout(() => {
          if (!cancelled) {
            setScrollToMessageId(jumpToMessageId);
            // Reset the jump request after the scroll is initiated
            setJumpToMessageId(null);

            // Clear the scroll target after a delay to prevent re-scrolling
            // when new messages arrive later.
            setTimeout(() => {
              if (!cancelled) {
                setScrollToMessageId(null);
              }
            }, 2000);
          }
        }, 250);
      } else {
        setScrollToMessageId(null);
        setJumpToMessageId(null);
      }
    };

    void jumpToMessage();

    return () => {
      cancelled = true;
    };
  }, [jumpToMessageId, isLoading, setJumpToMessageId]);

  if (!caseId) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-surface-secondary px-4">
        <EmptyState
          title="No case selected"
          description="Choose a case from the sidebar to open the chat."
        />
      </div>
    );
  }
  const showMeetingOverlay = isInMeeting && meetingCaseId === caseId && viewMode === "expanded";
  const showMeetingPiP = isInMeeting && viewMode === "pip";

  return (
    <div className="relative flex h-full flex-col min-h-0 bg-[#FAFBFF]">
      <ChatHeader
        caseId={caseId}
        activePanel={activePanel}
        onTogglePanel={togglePanel}
        onlineUserIds={onlineUserIds}
        onCaseLoaded={(data) => setIsArchived(data.status === "archived")}
        onJumpToMessage={setJumpToMessageId}
      />

      <PinnedMessageBanner 
        caseId={caseId} 
        messages={messages} 
        onMessageClick={setJumpToMessageId} 
      />

      <MessageList
        caseId={caseId}
        messages={messages}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        loadMore={loadMore}
        currentUserId={user?._id ?? ""}
        onReply={setActiveReplyMessage}
        onDelete={setMessageToDelete}
        onEdit={handleOpenEdit}
        onPin={!isObserver ? handlePin : undefined}
        onUnpin={!isObserver ? handleUnpin : undefined}
        onToggleReaction={(messageId, emoji) => {
          if (!socket) return;
          socket.emit("toggle_reaction", {
            caseId,
            messageId,
            emoji,
          });
        }}
        isArchived={isArchived}
        scrollToMessageId={scrollToMessageId}
        onShowContactPreview={onShowContactPreview}
      />

      <TypingIndicator typingUserNames={typingUserNames} />

      <MessageInput
        caseId={caseId}
        isArchived={isArchived}
        isObserver={isObserver}
        onTyping={notifyTyping}
        replyToMessage={activeReplyMessage}
        onCancelReply={() => setActiveReplyMessage(null)}
      />

      <ConfirmDialog
        isOpen={!!messageToDelete}
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setMessageToDelete(null)}
        isDestructive={true}
      />

      <Modal
        isOpen={!!messageToEdit}
        onClose={handleCloseEdit}
        title="Edit Message"
      >
        <div className="space-y-4">
          <textarea
            value={editDraft}
            onChange={(event) => setEditDraft(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Edit your message..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseEdit}
              className="px-4 py-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEditConfirm}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Meeting Overlay */}
      {showMeetingOverlay && <MeetingRoom />}

      {/* Meeting PiP */}
      {showMeetingPiP && <MeetingPiP />}
    </div>
  );
};
