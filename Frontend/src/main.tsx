import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { MeetingProvider } from "./contexts/MeetingContext";
import { AppErrorFallback } from "./components/ui/AppErrorFallback";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={AppErrorFallback}>
        <AuthProvider>
          <SocketProvider>
            <MeetingProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </MeetingProvider>
          </SocketProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
