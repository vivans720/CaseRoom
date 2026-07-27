import { fireEvent, render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders initials correctly for a single name", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders initials correctly for a full name", () => {
    render(<Avatar name="Alice Bob" />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("renders initials correctly for a multi-part name", () => {
    render(<Avatar name="Alice Middle Bob" />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("applies the correct size class", () => {
    const { container } = render(<Avatar name="Alice" size="lg" />);
    const avatar = container.querySelector("span span");
    expect(avatar).toHaveClass("w-11");
    expect(avatar).toHaveClass("h-11");
  });

  it("renders online status dot when isOnline is true", () => {
    render(<Avatar name="Alice" isOnline={true} />);
    const dot = screen.getByLabelText("Online");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-success");
  });

  it("renders offline status dot when isOnline is false", () => {
    render(<Avatar name="Alice" isOnline={false} />);
    const dot = screen.getByLabelText("Offline");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-text-tertiary");
  });

  it("does not render status dot when isOnline is undefined", () => {
    render(<Avatar name="Alice" />);
    expect(screen.queryByLabelText("Online")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Offline")).not.toBeInTheDocument();
  });

  it("uses a consistent color for the same name", () => {
    const { rerender } = render(<Avatar name="Alice" />);
    const firstColor = screen.getByLabelText("Alice").className;

    rerender(<Avatar name="Alice" />);
    const secondColor = screen.getByLabelText("Alice").className;

    expect(firstColor).toBe(secondColor);
  });

  it("renders profile picture when src is provided", () => {
    render(<Avatar name="Alice" src="https://example.com/avatar.jpg" />);
    const image = screen.getByAltText("Alice");
    expect(image).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("falls back to initials when image fails to load", () => {
    render(<Avatar name="Alice" src="https://example.com/avatar.jpg" />);
    const image = screen.getByAltText("Alice");
    fireEvent.error(image);
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
