import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaVaultPanel } from "../../components/chat/MediaVaultPanel";
import * as messageService from "../../services/messageService";
import { vi, Mock } from "vitest";
import type { VaultResponse } from "../../types";

vi.mock("../../services/messageService");

describe("MediaVaultPanel", () => {
  const mockCaseId = "case-123";
  const mockOnClose = vi.fn();
  const mockOnJumpToMessage = vi.fn();

  const mockVaultData: VaultResponse = {
    items: [
      {
        id: "msg1_file",
        messageId: "msg1",
        category: "document",
        type: "document",
        fileName: "case_report.pdf",
        fileUrl: "http://example.com/case_report.pdf",
        fileSize: 1048576,
        fileMimeType: "application/pdf",
        sender: {
          _id: "u1",
          employeeId: "EMP1",
          name: "Alice Smith",
          email: "alice@example.com",
          phone: "123",
          lastSeen: null,
          pinnedCases: [],
          createdAt: "",
          updatedAt: "",
        },
        createdAt: "2026-07-24T10:00:00Z",
      },
      {
        id: "msg2_link_0",
        messageId: "msg2",
        category: "link",
        type: "link",
        url: "https://example.com/reference",
        content: "Check this out https://example.com/reference",
        sender: {
          _id: "u2",
          employeeId: "EMP2",
          name: "Bob Jones",
          email: "bob@example.com",
          phone: "456",
          lastSeen: null,
          pinnedCases: [],
          createdAt: "",
          updatedAt: "",
        },
        createdAt: "2026-07-24T10:05:00Z",
      },
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 2,
      limit: 50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (messageService.getCaseVaultItems as Mock).mockResolvedValue(mockVaultData);
  });

  it("renders panel header and vault items", async () => {
    render(
      <MediaVaultPanel
        caseId={mockCaseId}
        onClose={mockOnClose}
        onJumpToMessage={mockOnJumpToMessage}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Files & Media")).toBeInTheDocument();
      expect(screen.getByText("case_report.pdf")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/reference")).toBeInTheDocument();
    });
  });

  it("switches category tabs and triggers service call", async () => {
    const user = userEvent.setup();
    render(
      <MediaVaultPanel
        caseId={mockCaseId}
        onClose={mockOnClose}
        onJumpToMessage={mockOnJumpToMessage}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("category-tab-document")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("category-tab-document"));

    await waitFor(() => {
      expect(messageService.getCaseVaultItems).toHaveBeenCalledWith(
        mockCaseId,
        "document",
        ""
      );
    });
  });

  it("filters items via search input", async () => {
    render(
      <MediaVaultPanel
        caseId={mockCaseId}
        onClose={mockOnClose}
        onJumpToMessage={mockOnJumpToMessage}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("vault-search-input")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("vault-search-input");
    fireEvent.change(searchInput, { target: { value: "report" } });

    await waitFor(() => {
      expect(messageService.getCaseVaultItems).toHaveBeenCalledWith(
        mockCaseId,
        "all",
        "report"
      );
    });
  });

  it("triggers onJumpToMessage when View in Chat button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MediaVaultPanel
        caseId={mockCaseId}
        onClose={mockOnClose}
        onJumpToMessage={mockOnJumpToMessage}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("View in Chat")[0]).toBeInTheDocument();
    });

    await user.click(screen.getAllByText("View in Chat")[0]);

    expect(mockOnJumpToMessage).toHaveBeenCalledWith("msg1");
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MediaVaultPanel
        caseId={mockCaseId}
        onClose={mockOnClose}
        onJumpToMessage={mockOnJumpToMessage}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Close panel")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Close panel"));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
