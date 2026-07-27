import type { JSX } from "react"

interface TypingIndicatorProps {
  typingUserNames: string[]
}

/** Builds a human-readable typing label from a list of names. */
const buildTypingLabel = (names: string[]): string => {
  if (names.length === 1) return `${names[0]} is typing`
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`
  return `${names[0]}, ${names[1]} and ${names.length - 2} other${names.length - 2 > 1 ? "s" : ""} are typing`
}

/**
 * Renders an animated typing indicator when one or more remote users are typing.
 * Returns null when no one is typing.
 */
export const TypingIndicator = ({
  typingUserNames,
}: TypingIndicatorProps): JSX.Element | null => {
  if (typingUserNames.length === 0) return null

  const label = buildTypingLabel(typingUserNames)

  return (
    <div
      className="flex items-center gap-2 px-4 py-1 h-7 text-sm text-text-secondary"
      aria-live="polite"
      aria-label={`${label}…`}
    >
      <span className="text-xs truncate">{label}</span>

      {/* Animated bouncing dots */}
      <span className="flex items-center gap-0.5" aria-hidden="true">
        <span
          className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </span>
    </div>
  )
}
