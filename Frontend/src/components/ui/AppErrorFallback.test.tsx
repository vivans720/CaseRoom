import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorFallback } from "./AppErrorFallback";

const ThrowOnce = (): JSX.Element => {
  throw new Error("test render error");
};

describe("AppErrorFallback", () => {
  it("renders fallback with error message and actions when child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary FallbackComponent={AppErrorFallback}>
        <ThrowOnce />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("test render error")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reload page/i }),
    ).toBeInTheDocument();
  });

});
