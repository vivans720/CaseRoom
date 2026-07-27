import { useState, useEffect } from "react"
import { useSocket } from "./useSocket"

interface OnlineUsersPayload {
  caseId: string
  onlineUsers: string[]
}

interface UserOnlinePayload {
  userId: string
  caseId: string
  name: string
}

interface UserOfflinePayload {
  userId: string
  caseId: string
  lastSeen: string
}

export interface UsePresenceReturn {
  onlineUserIds: Set<string>
  lastSeenUpdates: Record<string, string>
}

/**
 * Tracks online presence for a given case room.
 *
 * Listens for:
 * - `online_users`  — initial list of online user IDs for the case (from get_online_users)
 * - `user_online`   — a user just came online
 * - `user_offline`  — a user just went offline
 *
 * Resets whenever caseId changes; safe to call with undefined.
 */
export const usePresence = (caseId: string | undefined): UsePresenceReturn => {
  const { socket } = useSocket()
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [lastSeenUpdates, setLastSeenUpdates] = useState<Record<string, string>>({})
  const [prevCaseId, setPrevCaseId] = useState<string | undefined>(caseId)

  if (caseId !== prevCaseId) {
    setPrevCaseId(caseId)
    setOnlineUserIds(new Set())
    setLastSeenUpdates({})
  }



  useEffect(() => {
    if (!caseId || !socket) return

    socket.emit("get_online_users", { caseId })

    const handleOnlineUsers = (payload: OnlineUsersPayload) => {
      if (payload.caseId !== caseId) return
      setOnlineUserIds(new Set(payload.onlineUsers))
    }

    const handleUserOnline = (payload: UserOnlinePayload) => {
      if (payload.caseId !== caseId) return
      setOnlineUserIds((prev) => new Set([...prev, payload.userId]))
    }

    const handleUserOffline = (payload: UserOfflinePayload) => {
      if (payload.caseId !== caseId) return
      setOnlineUserIds((prev) => {
        const next = new Set(prev)
        next.delete(payload.userId)
        return next
      })
      
      if (payload.lastSeen) {
        setLastSeenUpdates((prev) => ({
          ...prev,
          [payload.userId]: payload.lastSeen,
        }))
      }
    }

    socket.on("online_users", handleOnlineUsers)
    socket.on("user_online", handleUserOnline)
    socket.on("user_offline", handleUserOffline)

    return () => {
      socket.off("online_users", handleOnlineUsers)
      socket.off("user_online", handleUserOnline)
      socket.off("user_offline", handleUserOffline)
    }
  }, [caseId, socket])

  return { onlineUserIds, lastSeenUpdates }
}
