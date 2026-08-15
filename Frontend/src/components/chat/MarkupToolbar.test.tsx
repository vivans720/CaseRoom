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
    onFitWidth: vi.fn(),
    onFitPage: vi.fn(),
    rotation: 0,
    onRotateLeft: vi.fn(),
    onRotateRight: vi.fn(),
    onUndo: vi.fn(),
    canUndo: true,
    onRedo: vi.fn(),
    canRedo: true,
    currentPage: 1,
    totalPages: 3,
    onPageChange: vi.fn(),
    onDownload: vi.fn(),
    onClose: vi.fn(),
    showNotesSidebar: false,
    onToggleNotesSidebar: vi.fn(),
    showAiSidebar: false,
    onToggleAiSidebar: vi.fn(),
    annotationCount: 2,
    isPdf: true,
  };

  it("renders toolbar buttons and page info for PDF", () => {
    render(<MarkupToolbar {...defaultProps} />);

    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByText("/ 3")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Notes (2)")).toBeInTheDocument();
  });

  it("calls tool select callback when pen tool clicked", () => {
    render(<MarkupToolbar {...defaultProps} />);

    const penBtn = screen.getByLabelText("Freehand Pen");
    fireEvent.click(penBtn);

    expect(defaultProps.onSelectTool).toHaveBeenCalledWith("pen");
  });

  it("calls zoom in, zoom out, fit width, and undo callbacks", () => {
    render(<MarkupToolbar {...defaultProps} />);

    const zoomInBtn = screen.getByLabelText("Zoom in");
    fireEvent.click(zoomInBtn);
    expect(defaultProps.onZoomIn).toHaveBeenCalled();

    const zoomOutBtn = screen.getByLabelText("Zoom out");
    fireEvent.click(zoomOutBtn);
    expect(defaultProps.onZoomOut).toHaveBeenCalled();

    const fitWidthBtn = screen.getByLabelText("Fit to width");
    fireEvent.click(fitWidthBtn);
    expect(defaultProps.onFitWidth).toHaveBeenCalled();

    const undoBtn = screen.getByLabelText("Undo");
    fireEvent.click(undoBtn);
    expect(defaultProps.onUndo).toHaveBeenCalled();
  });

  it("calls page change on page navigation buttons", () => {
    render(<MarkupToolbar {...defaultProps} />);

    const nextBtn = screen.getByLabelText("Next page");
    fireEvent.click(nextBtn);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it("handles direct page input change and commit on Enter or blur", () => {
    render(<MarkupToolbar {...defaultProps} />);

    const pageInput = screen.getByLabelText("Page number");
    fireEvent.change(pageInput, { target: { value: "3" } });
    fireEvent.blur(pageInput);

    expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
  });
});
