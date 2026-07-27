import type { JSX } from "react";

export const SkeletonLine = ({
  className = "",
}: {
  className?: string;
}): JSX.Element => (
  <div
    className={`animate-pulse rounded-md bg-surface-tertiary ${className}`}
    aria-hidden
  />
);

/** Placeholder rows while the case list is loading. */
export const CaseListSkeleton = (): JSX.Element => (
  <div
    className="px-3 py-2"
    role="status"
    aria-busy="true"
    aria-label="Loading cases"
  >
    {Array.from({ length: 7 }, (_, i) => (
      <div
        key={i}
        className="mb-3 flex items-center gap-2 px-3 py-2.5"
      >
        <SkeletonLine className="h-2 w-2 shrink-0 rounded-full" />
        <SkeletonLine className="h-4 flex-1" />
        <SkeletonLine className="h-5 w-5 shrink-0 rounded-full" />
      </div>
    ))}
  </div>
);

/** Placeholder bubbles while the first message page loads. */
export const MessageListSkeleton = (): JSX.Element => (
  <div
    className="flex flex-col gap-4 px-4 py-6"
    role="status"
    aria-busy="true"
    aria-label="Loading messages"
  >
    {Array.from({ length: 6 }, (_, i) => {
      const alignRight = i % 3 === 1;
      return (
        <div
          key={i}
          className={`flex w-full ${alignRight ? "justify-end" : "justify-start"}`}
        >
          <SkeletonLine
            className={`h-12 rounded-2xl ${alignRight ? "w-[55%]" : "w-[65%]"}`}
          />
        </div>
      );
    })}
  </div>
);
