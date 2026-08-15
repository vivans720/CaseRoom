import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CaseSettingsPanel } from "./CaseSettingsPanel";
import * as caseService from "../../services/caseService";
import { useAuth } from "../../hooks/useAuth";

vi.mock("../../services/caseService", () => ({
  getCaseById: vi.fn(),
  archiveCase: vi.fn(),
  unarchiveCase: vi.fn(),
  deleteCase: vi.fn(),
  exportCasePdf: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCreatorId = "user123";
const mockNonCreatorId = "user456";

const activeCaseMock = {
  _id: "case123",
  title: "Test Case",
  creatorId: mockCreatorId,
  status: "active",
  participants: [],
  isPinned: false,
};

const archivedCaseMock = {
  ...activeCaseMock,
  status: "archived",
};

describe("CaseSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <CaseSettingsPanel caseId="case123" />
      </MemoryRouter>,
    );
  };

  it("shows loading spinner initially", () => {
    (caseService.getCaseById as vi.Mock).mockReturnValue(new Promise(() => {}));
    (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

    renderComponent();
    expect(screen.getByRole("status")).toBeInTheDocument(); // Spinner uses role="status"
  });

  it("shows error if case fetch fails", async () => {
    (caseService.getCaseById as vi.Mock).mockRejectedValue(
      new Error("Net error"),
    );
    (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load case settings."),
      ).toBeInTheDocument();
    });
  });

  it("disables actions if user is not creator", async () => {
    (caseService.getCaseById as vi.Mock).mockResolvedValue(activeCaseMock);
    (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockNonCreatorId } });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Only the creator can modify these settings."),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /Archive Case/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Delete Case/i }),
    ).not.toBeInTheDocument();
  });

  it("shows buttons for creator and opens archive dialog", async () => {
    (caseService.getCaseById as vi.Mock).mockResolvedValue(activeCaseMock);
    (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

    renderComponent();

    const archiveBtn = await screen.findByRole("button", {
      name: "Archive Case",
    });
    const deleteBtn = screen.getByRole("button", { name: "Delete Case" });

    expect(archiveBtn).toBeInTheDocument();
    expect(archiveBtn).not.toBeDisabled();
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(archiveBtn);

    expect(
      screen.getByText(
        "Are you sure you want to archive this case? It will become read-only and no new messages can be added.",
      ),
    ).toBeInTheDocument();
  });

  it("calls archiveCase when confirmed", async () => {
    (caseService.getCaseById as vi.Mock).mockResolvedValue(activeCaseMock);
    (caseService.archiveCase as vi.Mock).mockResolvedValue(undefined);
    (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

    renderComponent();

    const setArchiveBtn = await screen.findByRole("button", {
      name: "Archive Case",
    });
    fireEvent.click(setArchiveBtn);

    const dialogArchiveBtn = screen.getByRole("button", { name: "Archive" });
    fireEvent.click(dialogArchiveBtn);

    await waitFor(() => {
      expect(caseService.archiveCase).toHaveBeenCalledWith("case123");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows unarchive button if already archived", async () => {
    (caseService.getCaseById as vi.Mock).mockResolvedValue(archivedCaseMock);
    (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

    renderComponent();

    const unarchiveBtn = await screen.findByRole("button", {
      name: "Unarchive Case",
    });
    expect(unarchiveBtn).toBeInTheDocument();
    expect(unarchiveBtn).not.toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Archive Case" }),
    ).not.toBeInTheDocument();
  });

  it("calls unarchiveCase when confirmed", async () => {
    (caseService.getCaseById as vi.Mock).mockResolvedValue(archivedCaseMock);
    (caseService.unarchiveCase as vi.Mock).mockResolvedValue(undefined);
    (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

    renderComponent();

    const unarchiveBtn = await screen.findByRole("button", {
      name: "Unarchive Case",
    });
    fireEvent.click(unarchiveBtn);

    const dialogUnarchiveBtn = screen.getByRole("button", { name: "Unarchive" });
    fireEvent.click(dialogUnarchiveBtn);

    await waitFor(() => {
      expect(caseService.unarchiveCase).toHaveBeenCalledWith("case123");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("calls deleteCase when confirmed", async () => {
    (caseService.getCaseById as vi.Mock).mockResolvedValue(activeCaseMock);
    (caseService.deleteCase as vi.Mock).mockResolvedValue(undefined);
    (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

    renderComponent();

    const deleteBtn = await screen.findByRole("button", {
      name: "Delete Case",
    });
    fireEvent.click(deleteBtn);

    const dialogDeleteDialog = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(dialogDeleteDialog);

    await waitFor(() => {
      expect(caseService.deleteCase).toHaveBeenCalledWith("case123");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Export Chat to PDF", () => {
    it("does not render export button for active cases", async () => {
      (caseService.getCaseById as vi.Mock).mockResolvedValue(activeCaseMock);
      (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Case Settings")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", { name: /Export Chat to PDF/i }),
      ).not.toBeInTheDocument();
    });

    it("renders export button for archived cases", async () => {
      (caseService.getCaseById as vi.Mock).mockResolvedValue(archivedCaseMock);
      (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

      renderComponent();

      const exportBtn = await screen.findByRole("button", {
        name: /Export Chat to PDF/i,
      });

      expect(exportBtn).toBeInTheDocument();
      expect(exportBtn).not.toBeDisabled();
    });

    it("calls exportCasePdf on click and handles loading state", async () => {
      (caseService.getCaseById as vi.Mock).mockResolvedValue(archivedCaseMock);
      (caseService.exportCasePdf as vi.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );
      (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

      renderComponent();

      const exportBtn = await screen.findByRole("button", {
        name: /Export Chat to PDF/i,
      });

      fireEvent.click(exportBtn);

      // Verify loading state
      expect(screen.getByText("Generating PDF...")).toBeInTheDocument();
      expect(exportBtn).toBeDisabled();

      await waitFor(() => {
        expect(caseService.exportCasePdf).toHaveBeenCalledWith(
          "case123",
          "Test Case",
        );
      });
    });

    it("shows error message when export fails", async () => {
      (caseService.getCaseById as vi.Mock).mockResolvedValue(archivedCaseMock);
      (caseService.exportCasePdf as vi.Mock).mockRejectedValue(
        new Error("Export failed"),
      );
      (useAuth as vi.Mock).mockReturnValue({ user: { _id: mockCreatorId } });

      renderComponent();

      const exportBtn = await screen.findByRole("button", {
        name: /Export Chat to PDF/i,
      });

      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to export chat to PDF."),
        ).toBeInTheDocument();
      });
    });
  });
});
