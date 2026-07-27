import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ImageCropperModal } from "../../components/profile/ImageCropperModal";

// Mock URL APIs
global.URL.createObjectURL = vi.fn(() => "mock-object-url");
global.URL.revokeObjectURL = vi.fn();

const mockFile = new File(["dummy content"], "avatar.png", { type: "image/png" });

describe("ImageCropperModal", () => {
  const onClose = vi.fn();
  const onCropComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock HTML5 Canvas API in jsdom
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D));

    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      const blob = new Blob(["mock cropped data"], { type: "image/jpeg" });
      callback(blob);
    });
  });

  it("does not render when isOpen is false", () => {
    render(
      <ImageCropperModal
        isOpen={false}
        imageFile={mockFile}
        onClose={onClose}
        onCropComplete={onCropComplete}
      />
    );
    expect(screen.queryByText("Edit Profile Photo")).not.toBeInTheDocument();
  });

  it("does not render when imageFile is null", () => {
    render(
      <ImageCropperModal
        isOpen={true}
        imageFile={null}
        onClose={onClose}
        onCropComplete={onCropComplete}
      />
    );
    expect(screen.queryByText("Edit Profile Photo")).not.toBeInTheDocument();
  });

  it("renders when open and file is provided, and shows spinner during loading", () => {
    render(
      <ImageCropperModal
        isOpen={true}
        imageFile={mockFile}
        onClose={onClose}
        onCropComplete={onCropComplete}
      />
    );
    expect(screen.getByText("Edit Profile Photo")).toBeInTheDocument();
    // Initially shows loading spinner
    expect(screen.getByRole("img", { name: "Original profile selection" })).toBeInTheDocument();
  });

  it("calls onClose when close or Cancel button is clicked", () => {
    render(
      <ImageCropperModal
        isOpen={true}
        imageFile={mockFile}
        onClose={onClose}
        onCropComplete={onCropComplete}
      />
    );

    // Click Close (X icon)
    const closeBtn = screen.getByLabelText("Close editor");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Click Cancel button
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("resets image zoom/position and handles crop callback", async () => {
    render(
      <ImageCropperModal
        isOpen={true}
        imageFile={mockFile}
        onClose={onClose}
        onCropComplete={onCropComplete}
      />
    );

    // Simulate image loaded
    const img = screen.getByRole("img", { name: "Original profile selection" });
    // Define natural dimensions on the element
    Object.defineProperty(img, "naturalWidth", { value: 600, configurable: true });
    Object.defineProperty(img, "naturalHeight", { value: 400, configurable: true });
    fireEvent.load(img);

    // Reset button should be enabled
    const resetBtn = screen.getByRole("button", { name: "Reset" });
    fireEvent.click(resetBtn);

    // Zoom scale range slider is rendered
    const slider = screen.getByLabelText("Zoom scale");
    expect(slider).toBeInTheDocument();

    // Click Apply/Save
    const applyBtn = screen.getByRole("button", { name: "Apply" });
    fireEvent.click(applyBtn);

    // Expect crop completion handler to be invoked with a File
    expect(onCropComplete).toHaveBeenCalledTimes(1);
    const croppedFile = onCropComplete.mock.calls[0][0] as File;
    expect(croppedFile).toBeInstanceOf(File);
    expect(croppedFile.name).toBe("avatar.png");
    expect(croppedFile.type).toBe("image/jpeg");
  });
});
