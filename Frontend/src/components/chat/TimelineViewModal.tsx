import { useState, useEffect } from "react"
import { Sparkles, X, AlertCircle, CheckCircle2, Clock, CheckCheck, RefreshCw, User, FileText, Plus, Zap } from "lucide-react"
import aiService, { type TimelineData, type TimelineItem } from "../../services/aiService"
import { createTask } from "../../services/taskService"

interface TimelineViewModalProps {
  caseId: string
  isOpen: boolean
  onClose: () => void
}

export const TimelineViewModal = ({ caseId, isOpen, onClose }: TimelineViewModalProps) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TimelineData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [createdTasks, setCreatedTasks] = useState<Record<number, boolean>>({})

  const fetchTimeline = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const result = await aiService.generateTimeline(caseId, forceRefresh)
      setData(result)
    } catch (err: any) {
      console.error("Failed to generate timeline:", err)
      setError(err?.response?.data?.message || "Failed to generate timeline. Ensure local Ollama service is active.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && !data) {
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
          badge: "bg-red-50 text-red-600 border border-red-200/60",
          node: "bg-red-500",
        }
      case "finding":
        return {
          icon: <FileText className="w-4 h-4 text-purple-500" />,
          badge: "bg-purple-50 text-purple-600 border border-purple-200/60",
          node: "bg-purple-500",
        }
      case "evidence":
        return {
          icon: <Zap className="w-4 h-4 text-blue-500" />,
          badge: "bg-blue-50 text-blue-600 border border-blue-200/60",
          node: "bg-blue-500",
        }
      case "decision":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          badge: "bg-emerald-50 text-emerald-600 border border-emerald-200/60",
          node: "bg-emerald-500",
        }
      case "resolution":
        return {
          icon: <CheckCheck className="w-4 h-4 text-indigo-500" />,
          badge: "bg-indigo-50 text-indigo-600 border border-indigo-200/60",
          node: "bg-indigo-500",
        }
      case "action":
      default:
        return {
          icon: <Clock className="w-4 h-4 text-amber-500" />,
          badge: "bg-amber-50 text-amber-600 border border-amber-200/60",
          node: "bg-amber-500",
        }
    }
  }

  const filteredTimeline = (data?.timeline || []).filter((item) => {
    if (filter === "all") return true
    return item.type.toLowerCase() === filter.toLowerCase()
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5B4CF3]/10 text-[#5B4CF3] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Investigation Timeline
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5B4CF3]/10 text-[#5B4CF3]">
                  AI Generated
                </span>
                {data?.cached && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Cached (Instant)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological milestone reconstruction with source message trace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        {data && (
          <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 flex items-center gap-2 overflow-x-auto">
            {["all", "issue", "finding", "evidence", "decision", "action", "resolution"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all ${
                  filter === f
                    ? "bg-[#5B4CF3] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="text-center py-14 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#5B4CF3] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Extracting chronological timeline with Gemma 3:4B...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-3">
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
            <div className="text-center py-12 text-slate-400 text-xs">
              No timeline events matching filter "{filter}".
            </div>
          )}

          {data && !loading && filteredTimeline.length > 0 && (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {filteredTimeline.map((item, idx) => {
                const style = getEventTypeStyle(item.type)
                const isCreated = createdTasks[idx]

                return (
                  <div key={idx} className="relative group">
                    {/* Circle Node */}
                    <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${style.node} shadow-xs`} />
                    
                    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-[#5B4CF3]/40 transition-all space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {style.icon}
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                          {item.time}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {item.event}
                      </p>

                      {item.sourceSnippet && (
                        <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic">
                          "{item.sourceSnippet}"
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        {item.actor && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{item.actor}</span>
                          </div>
                        )}

                        {item.type.toLowerCase() === "action" && (
                          <button
                            type="button"
                            onClick={() => handleCreateTaskFromAction(item, idx)}
                            disabled={isCreated}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isCreated
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-primary text-white hover:bg-primary-dark shadow-xs"
                            }`}
                          >
                            {isCreated ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Task Created
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                Create Task
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {data?.messageCount ? `Analyzed ${data.messageCount} chat messages` : "Powered by Ollama"}
          </span>
          <button
            onClick={() => fetchTimeline(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {data?.cached ? "Force Regenerate" : "Refresh Timeline"}
          </button>
        </div>
      </div>
    </div>
  )
}
