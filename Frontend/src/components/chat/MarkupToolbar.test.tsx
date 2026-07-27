import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MarkupToolbar } from "./MarkupToolbar";

describe("MarkupToolbar", () => {
  const defaultProps = {
    activeTool: "select" as const,
    onSelectTool: vi.fn(),
    color: "#ef4444",
    onChangeColor: vi.fn(),
    strokeWidth: 4,
    onChangeStrokeWidth: vi.fn(),
    zoom: 1,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onResetZoom: vi.fn(),
    rotation: 0,
    onRotateLeft: vi.fn(),
    onRotateRight: vi.fn(),
    currentPage: 1,
    totalPages: 3,
    onPageChange: vi.fn(),
    onClearAnnotations: vi.fn(),
    onDownload: vi.fn(),
    onClose: vi.fn(),
    showNotesSidebar: false,
    onToggleNotesSidebar: vi.fn(),
    annotationCount: 2,
    isPdf: true,
  };

  it("renders toolbar buttons and page info for PDF", () => {
    render(<MarkupToolbar {...defaultProps} />);

    expect(screen.getByText("Page 1 / 3")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Notes (2)")).toBeInTheDocument();
  });

  it("calls tool select callback when pen tool clicked", () => {
    render(<MarkupToolbar {...defaultProps} />);

    const penBtn = screen.getByTitle("Freehand Pen");
    fireEvent.click(penBtn);

    expect(defaultProps.onSelectTool).toHaveBeenCalledWith("pen");
  });

  it("calls zoom in and zoom out callbacks", () => {
    render(<MarkupToolbar {...defaultProps} />);

    const zoomInBtn = screen.getByTitle("Zoom In");
    fireEvent.click(zoomInBtn);
    expect(defaultProps.onZoomIn).toHaveBeenCalled();

    const zoomOutBtn = screen.getByTitle("Zoom Out");
    fireEvent.click(zoomOutBtn);
    expect(defaultProps.onZoomOut).toHaveBeenCalled();
  });

  it("calls page change on page navigation buttons", () => {
    render(<MarkupToolbar {...defaultProps} />);

    const prevButtons = screen.getAllByRole("button");
    const nextBtn = prevButtons.find((btn) => btn.querySelector(".lucide-chevron-right"));
    if (nextBtn) {
      fireEvent.click(nextBtn);
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    }
  });
});
