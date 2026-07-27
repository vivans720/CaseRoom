import {
  createContext,
  useContext,
  useEffect,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "../config/constants";
import { useAuth } from "../hooks/useAuth";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({
  children,
}: SocketProviderProps): JSX.Element => {
  const { isAuthenticated, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [prevAuth, setPrevAuth] = useState(isAuthenticated);

  if (isAuthenticated !== prevAuth) {
    setPrevAuth(isAuthenticated);
    if (!isAuthenticated) {
      setSocket(null);
      setIsConnected(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const newSocket = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
    });

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    return () => {
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocketContext = (): SocketContextValue => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }

  return context;
};
