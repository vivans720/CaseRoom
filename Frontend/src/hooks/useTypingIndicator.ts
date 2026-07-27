import { useState, useEffect, useCallback, useRef } from "react"
import { useSocket } from "./useSocket"

interface TypingStartPayload {
  userId: string
  name: string
}

interface TypingStopPayload {
  userId: string
}

interface TypingEntry {
  name: string
  timerId: ReturnType<typeof setTimeout>
}

export interface UseTypingIndicatorReturn {
  /** Names of users currently typing (excluding the local user) */
  typingUserNames: string[]
  /** Call this on every keystroke to emit typing events with debounce */
  notifyTyping: () => void
}

const TYPING_STOP_DEBOUNCE_MS = 2000
const TYPING_AUTO_CLEAR_MS = 3000

/**
 * Manages typing indicator state for a given case room.
 *
 * Emits:
 * - `typing_start` on the first keystroke (and again after a stop)
 * - `typing_stop` after 2s of no keystrokes (debounced)
 *
 * Listens for:
 * - `typing_start { userId, name }` — adds user to typingUsers
 * - `typing_stop  { userId }`       — removes user from typingUsers
 *
 * Each remote user auto-clears after 3s in case their stop event is missed.
 */
export const useTypingIndicator = (
  caseId: string | undefined,
): UseTypingIndicatorReturn => {
  const { socket, isConnected } = useSocket()

  // Map<userId, TypingEntry> — tracks remote users currently typing
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingEntry>>(
    new Map(),
  )

  // Whether we have already emitted typing_start for the current typing session
  const isTypingRef = useRef(false)
  // Debounce timer for emitting typing_stop
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset local typing state whenever caseId changes
  useEffect(() => {
    isTypingRef.current = false
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
    setTypingUsers(new Map())
  }, [caseId])

  // Listen for remote typing events
  useEffect(() => {
    if (!socket || !caseId) return

    const addTypingUser = (userId: string, name: string) => {
      setTypingUsers((prev) => {
        const next = new Map(prev)

        // Clear existing auto-clear timer for this user if present
        const existing = next.get(userId)
        if (existing) clearTimeout(existing.timerId)

        const timerId = setTimeout(() => {
          setTypingUsers((m) => {
            const updated = new Map(m)
            updated.delete(userId)
            return updated
          })
        }, TYPING_AUTO_CLEAR_MS)

        next.set(userId, { name, timerId })
        return next
      })
    }

    const removeTypingUser = (userId: string) => {
      setTypingUsers((prev) => {
        const existing = prev.get(userId)
        if (existing) clearTimeout(existing.timerId)
        const next = new Map(prev)
        next.delete(userId)
        return next
      })
    }

    const handleTypingStart = ({ userId, name }: TypingStartPayload) => {
      addTypingUser(userId, name)
    }

    const handleTypingStop = ({ userId }: TypingStopPayload) => {
      removeTypingUser(userId)
    }

    socket.on("typing_start", handleTypingStart)
    socket.on("typing_stop", handleTypingStop)

    return () => {
      socket.off("typing_start", handleTypingStart)
      socket.off("typing_stop", handleTypingStop)
    }
  }, [socket, caseId])

  // Clean up all timers when the hook unmounts
  useEffect(() => {
    return () => {
      typingUsers.forEach((entry) => clearTimeout(entry.timerId))
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Call on every keystroke in MessageInput.
   * - Emits `typing_start` if not already in a typing session.
   * - Resets the 2s debounce timer for `typing_stop`.
   */
  const notifyTyping = useCallback(() => {
    if (!socket || !isConnected || !caseId) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket.emit("typing_start", { caseId })
    }

    // Reset stop debounce
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(() => {
      socket.emit("typing_stop", { caseId })
      isTypingRef.current = false
    }, TYPING_STOP_DEBOUNCE_MS)
  }, [socket, isConnected, caseId])

  const typingUserNames = Array.from(typingUsers.values()).map((e) => e.name)

  return { typingUserNames, notifyTyping }
}
