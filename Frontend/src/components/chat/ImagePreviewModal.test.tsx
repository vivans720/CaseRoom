import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ImagePreviewModal } from "./ImagePreviewModal";

describe("ImagePreviewModal", () => {
  const mockOnClose = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    imageUrl: "http://example.com/image.png",
    fileName: "test-image.png",
    senderName: "Alice",
    sentAt: "2026-06-01T12:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Stub URL APIs for downloading
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:http://localhost/mock-blob"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not render when isOpen is false", () => {
    render(<ImagePreviewModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders correctly with image, sender details, and controls when open", () => {
    render(<ImagePreviewModal {...defaultProps} />);
    
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByAltText("test-image.png")).toBeInTheDocument();
    expect(screen.getByTitle("Zoom In")).toBeInTheDocument();
    expect(screen.getByTitle("Zoom Out")).toBeInTheDocument();
    expect(screen.getByTitle("Rotate Left")).toBeInTheDocument();
    expect(screen.getByTitle("Rotate Right")).toBeInTheDocument();
    expect(screen.getByTitle("Reset")).toBeInTheDocument();
    expect(screen.getByTitle("Download")).toBeInTheDocument();
    expect(screen.getByTitle("Close")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(<ImagePreviewModal {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Close"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    render(<ImagePreviewModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<ImagePreviewModal {...defaultProps} />);
    // Backdrop wrapper has role dialog
    fireEvent.click(screen.getByRole("dialog"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking on the image directly", () => {
    render(<ImagePreviewModal {...defaultProps} />);
    fireEvent.click(screen.getByAltText("test-image.png"));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("handles zoom operations", () => {
    render(<ImagePreviewModal {...defaultProps} />);
    const zoomInBtn = screen.getByTitle("Zoom In");
    const zoomOutBtn = screen.getByTitle("Zoom Out");
    
    expect(screen.getByText("100%")).toBeInTheDocument();
    
    // Zoom In
    fireEvent.click(zoomInBtn);
    expect(screen.getByText("125%")).toBeInTheDocument();
    
    // Zoom In again
    fireEvent.click(zoomInBtn);
    expect(screen.getByText("150%")).toBeInTheDocument();
    
    // Zoom Out
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText("125%")).toBeInTheDocument();
    
    // Zoom Out to minimum (100%)
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();
    
    // Zoom Out below 100% is disabled
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("handles rotation operations", () => {
    render(<ImagePreviewModal {...defaultProps} />);
    const rotateRightBtn = screen.getByTitle("Rotate Right");
    const rotateLeftBtn = screen.getByTitle("Rotate Left");
    const img = screen.getByAltText("test-image.png");
    
    // Initial style check
    expect(img.style.transform).toContain("rotate(0deg)");
    
    // Rotate Right (CW)
    fireEvent.click(rotateRightBtn);
    expect(img.style.transform).toContain("rotate(90deg)");
    
    // Rotate Right again
    fireEvent.click(rotateRightBtn);
    expect(img.style.transform).toContain("rotate(180deg)");
    
    // Rotate Left (CCW)
    fireEvent.click(rotateLeftBtn);
    expect(img.style.transform).toContain("rotate(90deg)");
  });

  it("resets zoom and rotation on reset click", () => {
    render(<ImagePreviewModal {...defaultProps} />);
    const zoomInBtn = screen.getByTitle("Zoom In");
    const rotateRightBtn = screen.getByTitle("Rotate Right");
    const resetBtn = screen.getByTitle("Reset");
    const img = screen.getByAltText("test-image.png");
    
    // Modify zoom and rotation
    fireEvent.click(zoomInBtn);
    fireEvent.click(rotateRightBtn);
    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(img.style.transform).toContain("scale(1.25)");
    expect(img.style.transform).toContain("rotate(90deg)");
    
    // Reset
    fireEvent.click(resetBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(img.style.transform).toContain("scale(1)");
    expect(img.style.transform).toContain("rotate(0deg)");
  });

  it("triggers fetch and download when download button is clicked", async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob([""], { type: "image/png" })),
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    // Mock HTMLAnchorElement click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ImagePreviewModal {...defaultProps} />);
    
    fireEvent.click(screen.getByTitle("Download"));
    
    // Need to wait for async fetch block
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("http://example.com/image.png");
      expect(clickSpy).toHaveBeenCalled();
    });

    clickSpy.mockRestore();
  });
});
