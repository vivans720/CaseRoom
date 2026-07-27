import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaseListSkeleton, MessageListSkeleton, SkeletonLine } from "./Skeleton";

describe("SkeletonLine", () => {
  it("renders", () => {
    const { container } = render(<SkeletonLine className="h-4 w-20" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe("CaseListSkeleton", () => {
  it("exposes loading status for screen readers", () => {
    render(<CaseListSkeleton />);
    expect(screen.getByLabelText(/loading cases/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("MessageListSkeleton", () => {
  it("exposes loading status for screen readers", () => {
    render(<MessageListSkeleton />);
    expect(screen.getByLabelText(/loading messages/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
