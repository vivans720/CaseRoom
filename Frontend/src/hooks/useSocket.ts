import { useSocketContext } from "../contexts/SocketContext"
import type { Socket } from "socket.io-client"

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
}

/**
 * Accessor hook for the SocketContext.
 * Must be used inside a SocketProvider.
 */
export const useSocket = (): UseSocketReturn => {
  return useSocketContext()
}
