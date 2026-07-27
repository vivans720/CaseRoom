import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders title and description when open", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        description="Test Description"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Test Title"
        description="Test Description"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(container.textContent).toBe("");
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const mockConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        description="Test"
        confirmText="Yes, delete it"
        onConfirm={mockConfirm}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Yes, delete it"));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const mockCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        description="Test"
        onConfirm={() => {}}
        onCancel={mockCancel}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it("uses destructive styles when isDestructive is true", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        description="Test"
        confirmText="Destroy"
        onConfirm={() => {}}
        onCancel={() => {}}
        isDestructive={true}
      />,
    );
    const confirmButton = screen.getByText("Destroy");
    expect(confirmButton.className).toContain("text-danger");
    expect(confirmButton.className).toContain("bg-danger");
  });
});
