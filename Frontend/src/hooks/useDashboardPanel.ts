import { useOutletContext } from "react-router-dom"

import type { User } from "../types"

export type RightPanel = "participants" | "settings" | "search" | "media" | "tasks" | "assistant" | "similar" | "insights" | null

export interface DashboardOutletContext {
  activePanel: RightPanel;
  togglePanel: (panel: RightPanel) => void;
  jumpToMessageId: string | null;
  setJumpToMessageId: (id: string | null) => void;
  onShowContactPreview: (user: User) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * Accessor for the Dashboard outlet context.
 * Provides activePanel state and togglePanel function to nested routes.
 * Must be used inside a component rendered as a child route of DashboardPage.
 */
export const useDashboardPanel = (): DashboardOutletContext =>
  useOutletContext<DashboardOutletContext>()
