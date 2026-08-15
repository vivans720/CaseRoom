import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { annotationService } from "../../services/annotationService";

vi.mock("../../hooks/usePdfDocument", () => ({
  usePdfDocument: vi.fn(() => ({
    pdfDocument: null,
    numPages: 5,
    isLoading: false,
    error: null,
  })),
}));

vi.mock("../../services/annotationService", () => ({
  annotationService: {
    getAnnotations: vi.fn().mockResolvedValue([]),
    createAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
  },
}));

describe("DocumentPreviewModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    fileUrl: "http://example.com/test_doc.pdf",
    fileName: "Contract_Audit_2026.pdf",
    caseId: "case-123",
    messageId: "msg-123",
    senderName: "Hannah Abbott",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(annotationService.getAnnotations).mockResolvedValue([
      {
        _id: "ann-1",
        caseId: "case-123",
        messageId: "msg-123",
        fileUrl: "http://example.com/test_doc.pdf",
        pageNumber: 1,
        type: "pen",
        coordinates: { points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }] },
        style: { color: "#ef4444", strokeWidth: 4 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: { _id: "user-1", name: "Hannah Abbott" },
      },
    ]);
  });

  it("renders document header with filename, sender, and save indicator", async () => {
    render(<DocumentPreviewModal {...defaultProps} />);

    expect(screen.getByText("Contract_Audit_2026.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Shared by Hannah Abbott/)).toBeInTheDocument();
    expect(screen.getByText("✓ Saved")).toBeInTheDocument();
  });

  it("handles keyboard shortcuts to switch tools", async () => {
    render(<DocumentPreviewModal {...defaultProps} />);

    // Pen tool shortcut P
    fireEvent.keyDown(window, { key: "p" });
    const penBtn = screen.getByLabelText("Freehand Pen");
    expect(penBtn).toHaveClass("bg-indigo-600");

    // Highlighter tool shortcut H
    fireEvent.keyDown(window, { key: "h" });
    const highlighterBtn = screen.getByLabelText("Highlighter");
    expect(highlighterBtn).toHaveClass("bg-amber-500");

    // Text tool shortcut T
    fireEvent.keyDown(window, { key: "t" });
    const textBtn = screen.getByLabelText("Add Text");
    expect(textBtn).toHaveClass("bg-indigo-600");

    // Select tool shortcut V
    fireEvent.keyDown(window, { key: "v" });
    const selectBtn = screen.getByLabelText("Select annotation");
    expect(selectBtn).toHaveClass("bg-indigo-600");
  });

  it("handles zoom keyboard shortcuts (+ / - / 0)", async () => {
    render(<DocumentPreviewModal {...defaultProps} />);

    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "+" });
    expect(screen.getByText("125%")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "-" });
    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "0" });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("opens AI sidebar when Ask AI clicked", async () => {
    render(<DocumentPreviewModal {...defaultProps} />);

    const askAiBtn = screen.getByTitle("AI Document Assistant");
    fireEvent.click(askAiBtn);

    expect(screen.getByText("AI Document Assistant")).toBeInTheDocument();
    expect(screen.getByText("Ask for Summary")).toBeInTheDocument();
  });

  it("opens Notes sidebar with loaded annotations", async () => {
    render(<DocumentPreviewModal {...defaultProps} />);

    await waitFor(() => {
      expect(annotationService.getAnnotations).toHaveBeenCalled();
    });

    const notesBtn = screen.getByTitle("Document Notes & Annotations");
    fireEvent.click(notesBtn);

    expect(screen.getByText("Notes & Annotations")).toBeInTheDocument();
    expect(screen.getByText("pen (Page 1)")).toBeInTheDocument();
  });

  it("handles Escape key to close modal", async () => {
    render(<DocumentPreviewModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
