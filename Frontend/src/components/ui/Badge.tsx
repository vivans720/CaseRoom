import type { JSX } from "react"

const DEFAULT_MAX_COUNT = 99

interface BadgeProps {
  count: number
  max?: number
}

export const Badge = ({
  count,
  max = DEFAULT_MAX_COUNT,
}: BadgeProps): JSX.Element | null => {
  if (count <= 0) return null

  const label = count > max ? `${max}+` : String(count)

  return (
    <span
      className="flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white"
      aria-label={`${count} unread`}
    >
      {label}
    </span>
  )
}
