import { render, screen, act, fireEvent } from "@testing-library/react";
import { Toast } from "./Toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders title and description", () => {
    render(
      <Toast
        title="Message Received"
        description="Hello there!"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Message Received")).toBeInTheDocument();
    expect(screen.getByText("Hello there!")).toBeInTheDocument();
  });

  it("calls onClose when dismiss button is clicked", () => {
    const onClose = vi.fn();
    render(<Toast title="Test" onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose automatically after autoDismissMs", () => {
    const onClose = vi.fn();
    render(<Toast title="Test" onClose={onClose} autoDismissMs={3000} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders and handles action button", () => {
    const onAction = vi.fn();
    render(
      <Toast
        title="Test"
        onClose={vi.fn()}
        action={{ label: "View", onClick: onAction }}
      />,
    );

    const actionButton = screen.getByRole("button", { name: /view/i });
    fireEvent.click(actionButton);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
