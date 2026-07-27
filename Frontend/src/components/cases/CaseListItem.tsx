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

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "Critical":
        return "bg-red-50 text-red-600 border border-red-200/60 font-bold"
      case "High":
        return "bg-amber-50 text-amber-600 border border-amber-200/60 font-semibold"
      case "Medium":
        return "bg-purple-50 text-[#5B4CF3] border border-purple-200/60 font-semibold"
      case "Low":
      default:
        return "bg-slate-100 text-slate-600 border border-slate-200/60 font-medium"
    }
  }

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-red-500 ring-2 ring-red-100"
      case "In Progress":
        return "bg-amber-500 ring-2 ring-amber-100"
      case "Under Review":
        return "bg-purple-500 ring-2 ring-purple-100"
      case "Resolved":
        return "bg-emerald-500 ring-2 ring-emerald-100"
      case "Closed":
      case "archived":
        return "bg-slate-400"
      case "active":
      default:
        return "bg-emerald-500 ring-2 ring-emerald-100"
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
          "group relative flex items-start gap-3 mx-1.5 my-1.5 p-3.5 rounded-2xl transition-all duration-200 border cursor-pointer",
          isActive
            ? "bg-gradient-to-r from-purple-100/70 via-purple-50/50 to-white text-[#5B4CF3] font-semibold border-purple-300 shadow-xs border-l-4 border-l-[#5B4CF3]"
            : "bg-white/70 hover:bg-purple-50/30 hover:border-purple-200/80 hover:shadow-xs hover:-translate-y-[1px] border-slate-100 text-slate-700",
        ].join(" ")
      }
      aria-label={`Case: ${caseData.title}`}
    >
      {/* Status dot */}
      <span
        className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${getStatusDotColor(
          caseData.status,
        )} transition-transform duration-200 group-hover:scale-110`}
        title={`Status: ${getStatusLabel(caseData.status)}`}
      />

      {/* Title & Metadata */}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-extrabold tracking-tight text-slate-900 leading-snug">
            {caseData.title}
          </span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${getPriorityStyle(
              priority,
            )}`}
          >
            {priority}
          </span>
          {category && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/70">
              {category}
            </span>
          )}
        </div>

        {/* Metadata (Assignee & Relative Time) */}
        <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1 text-slate-600">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {creatorName}
          </span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Right side: unread badge + pin toggle */}
      <span className="flex shrink-0 items-center gap-1.5 mt-0.5">
        {unreadCount > 0 && <Badge count={unreadCount} />}

        <button
          type="button"
          onClick={handlePinClick}
          className={[
            "rounded-lg p-1 transition-all focus:outline-none hover:bg-slate-100",
            isPinned
              ? "text-amber-500 opacity-100 bg-amber-50/50"
              : "text-slate-400 opacity-0 group-hover:opacity-100",
          ].join(" ")}
          aria-label={isPinned ? "Unpin case" : "Pin case"}
          title={isPinned ? "Unpin case" : "Pin case"}
        >
          <PinIcon filled={isPinned} />
        </button>
      </span>
    </NavLink>
  )
}
