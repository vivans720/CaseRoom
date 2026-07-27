import { useEffect, useRef } from "react";
import { useSocket } from "./useSocket";

/**
 * Joins a case socket room on mount and leaves on unmount.
 * Also requests the initial online-user list after joining.
 *
 * Re-runs whenever caseId changes (navigating between cases).
 * Safe to call with undefined — does nothing until caseId is defined.
 */
export const useCaseSocket = (
  caseId: string | undefined,
  callbacks?: {
    onMessageRead?: (event: {
      caseId: string;
      messageId: string;
      readBy: { userId: string; readAt: string }[];
    }) => void;
  },
): void => {
  const { socket, isConnected } = useSocket();
  // Store a stable reference to callbacks to prevent frequent re-bindings
  // if consumers define them inline without useCallback
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!caseId || !socket || !isConnected) return;

    socket.emit("join_case", { caseId });
    socket.emit("get_online_users", { caseId });

    interface MessageReadEvent {
      caseId: string;
      messageId: string;
      readBy: { userId: string; readAt: string }[];
    }

    const handleMessageRead = (event: MessageReadEvent) => {
      callbacksRef.current?.onMessageRead?.(event);
    };

    socket.on("message_read", handleMessageRead);

    return () => {
      socket.emit("leave_case", { caseId });
      socket.off("message_read", handleMessageRead);
    };
  }, [caseId, socket, isConnected]);
};
