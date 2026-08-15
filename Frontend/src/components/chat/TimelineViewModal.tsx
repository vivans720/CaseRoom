import { useState, useEffect } from "react"
import { Sparkles, X, AlertCircle, CheckCircle2, Clock, CheckCheck, RefreshCw, Plus, Zap, ArrowUpRight, Bookmark, Check, FileText } from "lucide-react"
import aiService, { type TimelineData, type TimelineItem } from "../../services/aiService"
import { createTask } from "../../services/taskService"
import { Avatar } from "../ui/Avatar"

interface TimelineViewModalProps {
  caseId: string
  isOpen: boolean
  onClose: () => void
  onJumpToMessage?: (messageId: string) => void
}

const formatTimestamp = (timeStr?: string): string => {
  if (!timeStr) return ""
  const date = new Date(timeStr)
  if (!isNaN(date.getTime())) {
    return (
      date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      ", " +
      date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    )
  }
  return timeStr
}

export const TimelineViewModal = ({ caseId, isOpen, onClose, onJumpToMessage }: TimelineViewModalProps) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TimelineData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [createdTasks, setCreatedTasks] = useState<Record<number, boolean>>({})
  const [bookmarkedItems, setBookmarkedItems] = useState<Record<number, boolean>>({})
  const [acknowledgedItems, setAcknowledgedItems] = useState<Record<number, boolean>>({})
  const [expandedQuotes, setExpandedQuotes] = useState<Record<number, boolean>>({})

  const fetchTimeline = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const result = await aiService.generateTimeline(caseId, forceRefresh)
      setData(result)
    } catch (err: any) {
      console.error("Failed to generate timeline:", err)
      setError(err?.response?.data?.message || "Failed to generate timeline. Ensure AI service is active.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && caseId) {
      fetchTimeline()
    }
  }, [isOpen, caseId])

  if (!isOpen) return null

  const handleCreateTaskFromAction = async (item: TimelineItem, idx: number) => {
    try {
      await createTask(caseId, {
        title: item.event,
        description: `Auto-created from AI Timeline Event (Actor: ${item.actor || "Investigator"}). Source: ${item.sourceSnippet || "Case Chat"}`,
        priority: "medium",
      })
      setCreatedTasks((prev) => ({ ...prev, [idx]: true }))
    } catch (err) {
      console.error("Failed to create task from timeline action:", err)
    }
  }

  const getEventTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "issue":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          badge: "bg-red-50 text-red-600 border border-red-200/60 font-bold",
          node: "bg-red-500",
          nodeTitle: "Issue milestone",
        }
      case "finding":
        return {
          icon: <FileText className="w-4 h-4 text-purple-500" />,
          badge: "bg-purple-50 text-purple-600 border border-purple-200/60 font-bold",
          node: "bg-purple-500",
          nodeTitle: "Finding milestone",
        }
      case "evidence":
        return {
          icon: <Zap className="w-4 h-4 text-blue-500" />,
          badge: "bg-blue-50 text-blue-600 border border-blue-200/60 font-bold",
          node: "bg-blue-500",
          nodeTitle: "Evidence milestone",
        }
      case "decision":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          badge: "bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-bold",
          node: "bg-emerald-500",
          nodeTitle: "Decision milestone",
        }
      case "resolution":
        return {
          icon: <CheckCheck className="w-4 h-4 text-indigo-500" />,
          badge: "bg-indigo-50 text-indigo-600 border border-indigo-200/60 font-bold",
          node: "bg-indigo-500",
          nodeTitle: "Resolution milestone",
        }
      case "action":
      default:
        return {
          icon: <Clock className="w-4 h-4 text-amber-500" />,
          badge: "bg-amber-50 text-amber-600 border border-amber-200/60 font-bold",
          node: "bg-amber-500",
          nodeTitle: "Action milestone",
        }
    }
  }

  const rawTimeline = data?.timeline || []

  // Dynamic filter counts
  const counts = rawTimeline.reduce<Record<string, number>>((acc, item) => {
    const t = item.type.toLowerCase()
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  const filteredTimeline = rawTimeline.filter((item) => {
    if (filter === "all") return true
    return item.type.toLowerCase() === filter.toLowerCase()
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5B4CF3]/10 text-[#5B4CF3] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Investigation Timeline
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5B4CF3]/10 text-[#5B4CF3]">
                  AI Generated
                </span>
                {data?.cached && (
                  <span
                    title="This timeline was synthesized recently from case messages. Click 'Force Regenerate' below to re-analyze latest messages."
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 cursor-help"
                  >
                    Cached (Instant)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Chronological milestone reconstruction with source message trace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Integrated Category Filter Bar with Rail Color Indicators */}
        {data && (
          <div className="px-6 py-3 border-b border-slate-200/80 bg-slate-50/50 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {[
              { key: "all", label: "All", count: rawTimeline.length, dot: "bg-indigo-500" },
              { key: "issue", label: "Issue", count: counts.issue || 0, dot: "bg-red-500" },
              { key: "finding", label: "Finding", count: counts.finding || 0, dot: "bg-purple-500" },
              { key: "evidence", label: "Evidence", count: counts.evidence || 0, dot: "bg-blue-500" },
              { key: "decision", label: "Decision", count: counts.decision || 0, dot: "bg-emerald-500" },
              { key: "action", label: "Action", count: counts.action || 0, dot: "bg-amber-500" },
              { key: "resolution", label: "Resolution", count: counts.resolution || 0, dot: "bg-indigo-500" },
            ].map((tab) => {
              const isActive = filter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200/90 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${tab.dot} shrink-0`} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200/60"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 pr-4 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="text-center py-14 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#5B4CF3] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Extracting chronological timeline with AI...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Timeline Extraction Failed</p>
                <p className="mt-0.5">{error}</p>
                <button
                  onClick={() => fetchTimeline(true)}
                  className="mt-3 text-xs font-bold underline hover:no-underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {data && !loading && filteredTimeline.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              No timeline events matching filter "{filter}".
            </div>
          )}

          {data && !loading && filteredTimeline.length > 0 && (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {filteredTimeline.map((item, idx) => {
                const style = getEventTypeStyle(item.type)
                const isCreated = createdTasks[idx]
                const isBookmarked = bookmarkedItems[idx]
                const isAcknowledged = acknowledgedItems[idx]
                const itemTypeLower = item.type.toLowerCase()

                // Clean quote formatting & toggle logic
                const rawSnippet = item.sourceSnippet
                  ? item.sourceSnippet.replace(/^"(.*)"$/, "$1").trim()
                  : ""
                const isLongQuote = rawSnippet.length > 110
                const isExpanded = expandedQuotes[idx]
                const displayedQuote = isLongQuote && !isExpanded ? `${rawSnippet.slice(0, 110)}…` : rawSnippet

                return (
                  <div key={idx} className="relative group">
                    {/* Circle Node on Timeline Rail */}
                    <div
                      title={style.nodeTitle}
                      className={`absolute -left-6 top-2 w-3.5 h-3.5 rounded-full border-2 border-white ${style.node} shadow-xs transition-transform group-hover:scale-110 cursor-help`}
                    />

                    {/* Timeline Event Card */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#5B4CF3]/40 transition-all space-y-3 shadow-2xs">
                      {/* Top Row: Type Badge + Full Date & Time */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {style.icon}
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {formatTimestamp(item.time)}
                        </span>
                      </div>

                      {/* Event Summary Heading */}
                      <p className="text-xs font-bold text-slate-900 leading-relaxed">
                        {item.event}
                      </p>

                      {/* Clickable Source Quote Excerpt */}
                      {rawSnippet && (
                        <div
                          onClick={() => {
                            if (item.sourceMessageId) {
                              onJumpToMessage?.(item.sourceMessageId)
                              onClose()
                            }
                          }}
                          className={`p-3 rounded-xl bg-white border border-slate-200/80 transition-all text-xs text-slate-700 space-y-1.5 shadow-2xs group/quote ${
                            item.sourceMessageId ? "hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer" : ""
                          }`}
                          title={item.sourceMessageId ? "Click to jump to original message in chat" : undefined}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Source Excerpt</span>
                            {item.sourceMessageId && (
                              <span className="text-indigo-600 flex items-center gap-0.5 group-hover/quote:translate-x-0.5 transition-transform">
                                <span>Jump</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <p className="italic leading-relaxed text-slate-700">
                            "{displayedQuote}"
                          </p>
                          {isLongQuote && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedQuotes((prev) => ({ ...prev, [idx]: !prev[idx] }))
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer pt-0.5"
                            >
                              {isExpanded ? "Show less" : "Show full excerpt"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Footer Row: Avatar + Name & Contextual Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
                        {item.actor ? (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <Avatar name={item.actor} size="xs" />
                            <span>{item.actor}</span>
                          </div>
                        ) : (
                          <div />
                        )}

                        {/* Contextual Card Actions per Type */}
                        <div className="flex items-center gap-2">
                          {itemTypeLower === "action" && (
                            <button
                              type="button"
                              onClick={() => void handleCreateTaskFromAction(item, idx)}
                              disabled={isCreated}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isCreated
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-[#5B4CF3] hover:bg-[#4c3ed8] text-white shadow-xs"
                              }`}
                            >
                              {isCreated ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Task Created
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Create Task
                                </>
                              )}
                            </button>
                          )}

                          {(itemTypeLower === "finding" || itemTypeLower === "evidence") && (
                            <button
                              type="button"
                              onClick={() => setBookmarkedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                isBookmarked
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-purple-600 text-purple-600" : "text-slate-400"}`} />
                              <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
                            </button>
                          )}

                          {(itemTypeLower === "decision" || itemTypeLower === "issue") && (
                            <button
                              type="button"
                              onClick={() => setAcknowledgedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                isAcknowledged
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <Check className={`w-3.5 h-3.5 ${isAcknowledged ? "text-emerald-600 font-extrabold" : "text-slate-400"}`} />
                              <span>{isAcknowledged ? "Acknowledged" : "Acknowledge"}</span>
                            </button>
                          )}

                          {itemTypeLower === "resolution" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            {data?.messageCount ? `Analyzed ${data.messageCount} chat messages` : "Powered by CaseRoom AI"}
          </span>
          <button
            onClick={() => void fetchTimeline(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {data?.cached ? "Force Regenerate" : "Refresh Timeline"}
          </button>
        </div>
      </div>
    </div>
  )
}
