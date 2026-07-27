import type { JSX } from "react"

const SIZE_CLASSES = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
} as const

type SpinnerSize = keyof typeof SIZE_CLASSES

interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

export const Spinner = ({
  size = "md",
  className = "",
}: SpinnerProps): JSX.Element => (
  <div
    role="status"
    aria-label="Loading"
    className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${SIZE_CLASSES[size]} ${className}`}
  />
)
