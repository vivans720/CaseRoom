import type { JSX } from "react";
import type { FallbackProps } from "react-error-boundary";

export const AppErrorFallback = ({
  error,
  resetErrorBoundary,
}: FallbackProps): JSX.Element => (
  <div
    role="alert"
    className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-secondary px-4"
  >
    <h1 className="text-lg font-semibold text-text-primary">
      Something went wrong
    </h1>
    <p className="max-w-md text-center text-sm text-text-secondary">
      {error instanceof Error ? error.message : String(error)}
    </p>
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        Try again
      </button>
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
        className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
      >
        Reload page
      </button>
    </div>
  </div>
);
