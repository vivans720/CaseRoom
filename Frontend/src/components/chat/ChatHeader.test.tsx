import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatHeader } from "./ChatHeader";
import * as caseService from "../../services/caseService";
import { useSocket } from "../../hooks/useSocket";
import { vi, Mock } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../services/caseService");
vi.mock("../../hooks/useSocket");
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { _id: "u1", name: "Alice" } }),
}));
vi.mock("../notifications/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));
vi.mock("../meeting/JoinMeetingButton", () => ({
  JoinMeetingButton: () => <div data-testid="join-meeting-btn" />,
}));

describe("ChatHeader", () => {
  const mockCaseId = "case-123";
  const mockCase = {
    _id: mockCaseId,
    title: "Employee Access Termination Audit",
    description: "Reviewing system evidence and timeline events.",
    category: "HR",
    priority: "Low",
    status: "Closed",
  };
  const mockParticipants = [
    { _id: "u1", name: "Alice" },
    { _id: "u2", name: "Bob" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (caseService.getCaseById as Mock).mockResolvedValue(mockCase);
    (caseService.getCaseParticipants as Mock).mockResolvedValue(
      mockParticipants,
    );
    (useSocket as Mock).mockReturnValue({
      socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
      isConnected: true,
    });
  });

  it("renders loading state initially", () => {
    render(
      <MemoryRouter>
        <ChatHeader
          caseId={mockCaseId}
          activePanel="participants"
          onTogglePanel={vi.fn()}
          onlineUserIds={new Set()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders case title, category, and metadata after loading", async () => {
    render(
      <MemoryRouter>
        <ChatHeader
          caseId={mockCaseId}
          activePanel="participants"
          onTogglePanel={vi.fn()}
          onlineUserIds={new Set(["u1"])}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("Employee Access Termination Audit"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("HR")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Low Priority")).toBeInTheDocument();
    expect(screen.getByText("2 members")).toBeInTheDocument();
    expect(screen.getByText("1 online")).toBeInTheDocument();
  });

  it("calls onTogglePanel when toolbar buttons and more menu items are clicked", async () => {
    const user = userEvent.setup();
    const onTogglePanel = vi.fn();

    render(
      <MemoryRouter>
        <ChatHeader
          caseId={mockCaseId}
          activePanel="participants"
          onTogglePanel={onTogglePanel}
          onlineUserIds={new Set()}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText("View participants list"),
      ).toBeInTheDocument(),
    );

    // Direct header actions
    await user.click(screen.getByLabelText("View participants list"));
    expect(onTogglePanel).toHaveBeenCalledWith("participants");
    onTogglePanel.mockClear();

    await user.click(screen.getByLabelText("Search messages"));
    expect(onTogglePanel).toHaveBeenCalledWith("search");
    onTogglePanel.mockClear();

    await user.click(screen.getByTitle("Ask AI Assistant"));
    expect(onTogglePanel).toHaveBeenCalledWith("assistant");
    onTogglePanel.mockClear();

    // More menu dropdown actions
    await user.click(screen.getByLabelText("More options"));
    await user.click(screen.getByLabelText("Files & Media"));
    expect(onTogglePanel).toHaveBeenCalledWith("media");
    onTogglePanel.mockClear();

    await user.click(screen.getByLabelText("More options"));
    await user.click(screen.getByLabelText("Meeting History"));
    expect(onTogglePanel).toHaveBeenCalledWith("meetings");
    onTogglePanel.mockClear();

    await user.click(screen.getByLabelText("More options"));
    await user.click(screen.getByLabelText("Case settings"));
    expect(onTogglePanel).toHaveBeenCalledWith("settings");
  });

  it("renders 'Case not found' if fetching fails", async () => {
    (caseService.getCaseById as Mock).mockRejectedValue(new Error("Not found"));

    render(
      <MemoryRouter>
        <ChatHeader
          caseId={mockCaseId}
          activePanel="participants"
          onTogglePanel={vi.fn()}
          onlineUserIds={new Set()}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Case not found")).toBeInTheDocument(),
    );
  });
});
