import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";

vi.mock("../components/cases/CaseSidebar", () => ({
  CaseSidebar: () => <nav data-testid="case-sidebar">Sidebar</nav>,
}));

vi.mock("../components/notifications/NotificationToast", () => ({
  NotificationToast: () => null,
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { _id: "user-1", name: "Alice Smith" },
    isAuthenticated: true,
  }),
}));

vi.mock("../hooks/usePresence", () => ({
  usePresence: () => ({
    onlineUserIds: new Set(),
    lastSeenUpdates: {},
  }),
}));

const renderDashboard = (initialPath = "/") => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<DashboardPage />}>
          <Route
            path="case/:caseId"
            element={<div data-testid="chat-view">Chat View</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe("DashboardPage", () => {
  it("renders the sidebar", () => {
    renderDashboard();
    expect(screen.getByTestId("case-sidebar")).toBeInTheDocument();
  });

  it("shows empty state when no case is selected", () => {
    renderDashboard("/");
    expect(
      screen.getByText("Select a case to get started"),
    ).toBeInTheDocument();
  });

  it("renders the nested Outlet when a case is selected", () => {
    renderDashboard("/case/case-1");
    expect(screen.getByTestId("chat-view")).toBeInTheDocument();
    expect(
      screen.queryByText("Select a case to get started"),
    ).not.toBeInTheDocument();
  });
});
