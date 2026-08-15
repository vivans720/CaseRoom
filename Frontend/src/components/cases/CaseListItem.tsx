import type { JSX } from "react"
import { NavLink } from "react-router-dom"
import type { Case, User } from "../../types"
import { Badge } from "../ui/Badge"

interface CaseListItemProps {
  caseData: Case
  unreadCount: number
  onPin: () => void
  onUnpin: () => void
}

const PinIcon = ({ filled }: { filled: boolean }): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill={filled ? "#F59E0B" : "none"}
    stroke={filled ? "#F59E0B" : "currentColor"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const formatTimeAgo = (dateStr?: string): string => {
  if (!dateStr) return "recently"
  const diffMs = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diffMs)) return "recently"
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const getCreatorName = (creator?: string | User): string => {
  if (!creator) return "Team"
  if (typeof creator === "string") return "Team"
  return creator.name ? creator.name.split(" ")[0] : "User"
}

const UserAvatarIcon = (): JSX.Element => (
  <svg
    className="w-3 h-3 text-slate-400 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
)

export const CaseListItem = ({
  caseData,
  unreadCount,
  onPin,
  onUnpin,
}: CaseListItemProps): JSX.Element => {
  const isPinned = caseData.isPinned === true

  const handlePinClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (isPinned) {
      onUnpin()
    } else {
      onPin()
    }
  }

  const priority = caseData.priority || "Medium"
  const category = caseData.category
  const creatorName = getCreatorName(caseData.creatorId)
  const timeAgo = formatTimeAgo(caseData.updatedAt || caseData.createdAt)

  // Color-coded priority left-border stripe
  const getPriorityBorderStripe = (p: string) => {
    switch (p) {
      case "Critical":
        return "border-l-4 border-l-rose-500"
      case "High":
        return "border-l-4 border-l-amber-500"
      case "Medium":
        return "border-l-4 border-l-indigo-500"
      case "Low":
      default:
        return "border-l-4 border-l-slate-300"
    }
  }

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-rose-500"
      case "In Progress":
        return "bg-amber-500"
      case "Under Review":
        return "bg-indigo-500"
      case "Resolved":
        return "bg-emerald-500"
      case "Closed":
      case "archived":
        return "bg-slate-400"
      case "active":
      default:
        return "bg-emerald-500"
    }
  }

  const getStatusLabel = (status: string) => {
    if (status === "active") return "Active"
    if (status === "archived") return "Archived"
    return status
  }

  return (
    <NavLink
      to={`/case/${caseData._id}`}
      className={({ isActive }) =>
        [
          "group relative flex flex-col gap-2 mx-1.5 my-1 py-3.5 px-3.5 rounded-xl transition-all duration-150 border cursor-pointer",
          getPriorityBorderStripe(priority),
          isActive
            ? "bg-indigo-50/70 border-indigo-300 text-indigo-900 font-semibold shadow-2xs"
            : "bg-white hover:bg-slate-50/70 border-slate-100 text-slate-700 hover:border-slate-200",
        ].join(" ")
      }
      aria-label={`Case: ${caseData.title}`}
    >
      {/* Top row: Single Status dot + Title + Category tag + Unread/Pin */}
      <div className="flex items-center gap-2 min-w-0 w-full">
        {/* Single status dot with combined tooltip */}
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotColor(
            caseData.status,
          )}`}
          title={`Status: ${getStatusLabel(caseData.status)} • Priority: ${priority}`}
        />

        {/* Title */}
        <span className="truncate text-xs font-bold text-slate-900 flex-1 leading-snug">
          {caseData.title}
        </span>

        {/* Category Tag inline right next to title */}
        {category && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
            {category}
          </span>
        )}

        {/* Right side: unread count badge + pin toggle */}
        <span className="flex shrink-0 items-center gap-1.5">
          {unreadCount > 0 && <Badge count={unreadCount} />}

          <button
            type="button"
            onClick={handlePinClick}
            className={[
              "rounded p-0.5 transition-all focus:outline-none hover:bg-slate-200/60",
              isPinned
                ? "text-amber-500 opacity-100"
                : "text-slate-400 opacity-0 group-hover:opacity-100",
            ].join(" ")}
            aria-label={isPinned ? "Unpin case" : "Pin case"}
            title={isPinned ? "Unpin case" : "Pin case"}
          >
            <PinIcon filled={isPinned} />
          </button>
        </span>
      </div>

      {/* Bottom row: User avatar icon + Bold assignee name + Muted time */}
      <div className="flex items-center justify-between text-[11px] pl-4">
        <span className="truncate flex items-center gap-1.5">
          <UserAvatarIcon />
          <span className="font-bold text-slate-800">{creatorName}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400 font-normal">{timeAgo}</span>
        </span>
      </div>
    </NavLink>
  )
}
