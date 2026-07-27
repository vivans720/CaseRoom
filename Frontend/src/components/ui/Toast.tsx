import { useEffect, type JSX } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  title: string;
  description?: string;
  onClose: () => void;
  action?: ToastAction;
  autoDismissMs?: number;
}

export const Toast = ({
  title,
  description,
  onClose,
  action,
  autoDismissMs,
}: ToastProps): JSX.Element => {
  useEffect(() => {
    if (!autoDismissMs) return;

    const timerId = window.setTimeout(() => {
      onClose();
    }, autoDismissMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoDismissMs, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-sm rounded-xl border border-border bg-surface px-4 py-3 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-xs text-text-secondary">{description}</p>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary"
          aria-label="Dismiss notification"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};
