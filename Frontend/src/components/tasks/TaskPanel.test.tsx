import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskPanel } from "./TaskPanel";
import * as taskService from "../../services/taskService";
import * as caseService from "../../services/caseService";
import type { Task, User } from "../../types";

vi.mock("../../services/taskService");
vi.mock("../../services/caseService");
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { _id: "user-1", name: "Alice" } }),
}));
vi.mock("../../hooks/useSocket", () => ({
  useSocket: () => ({ socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() } }),
}));

const mockedTaskService = vi.mocked(taskService);
const mockedCaseService = vi.mocked(caseService);

const makeUser = (overrides: Partial<User> = {}): User => ({
  _id: "user-1",
  employeeId: "EMP001",
  name: "Alice Smith",
  email: "alice@example.com",
  phone: "1234567890",
  lastSeen: null,
  pinnedCases: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  _id: "task-1",
  caseId: "case-1",
  title: "Analyze Logs",
  description: "Check server errors",
  status: "todo",
  priority: "high",
  assignees: [makeUser()],
  createdBy: makeUser(),
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedCaseService.getCaseParticipants.mockResolvedValue([makeUser()]);
});

describe("TaskPanel", () => {
  it("renders task list and stats", async () => {
    mockedTaskService.getCaseTasks.mockResolvedValue({
      success: true,
      data: [makeTask()],
    });

    render(<TaskPanel caseId="case-1" currentUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("Analyze Logs")).toBeInTheDocument();
    });

    expect(screen.getByText("Action Items")).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it("toggles task completion status", async () => {
    const task = makeTask({ status: "todo" });
    mockedTaskService.getCaseTasks.mockResolvedValue({
      success: true,
      data: [task],
    });
    mockedTaskService.updateTask.mockResolvedValue({
      success: true,
      data: { ...task, status: "done" },
    });

    render(<TaskPanel caseId="case-1" currentUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("Analyze Logs")).toBeInTheDocument();
    });

    const toggleButton = screen.getByTitle("Mark as completed");
    await userEvent.click(toggleButton);

    expect(mockedTaskService.updateTask).toHaveBeenCalledWith(
      "case-1",
      "task-1",
      { status: "done" }
    );
  });

  it("opens create task modal", async () => {
    mockedTaskService.getCaseTasks.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<TaskPanel caseId="case-1" currentUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("No tasks found")).toBeInTheDocument();
    });

    const newBtn = screen.getByRole("button", { name: /new/i });
    await userEvent.click(newBtn);

    expect(screen.getByText("Create Action Item")).toBeInTheDocument();
  });
});
