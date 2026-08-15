import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Sparkles, X, CheckSquare, Square, AlertCircle, RefreshCw, PlusCircle, Check } from "lucide-react"
import aiService, { type ExtractedTask } from "../../services/aiService"
import { createTask } from "../../services/taskService"
import { Spinner } from "../ui/Spinner"
import { Avatar } from "../ui/Avatar"

interface AITaskExtractorModalProps {
  caseId: string
  isOpen: boolean
  onClose: () => void
  onTasksCreated: () => void
}

export const AITaskExtractorModal = ({
  caseId,
  isOpen,
  onClose,
  onTasksCreated,
}: AITaskExtractorModalProps) => {
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<ExtractedTask[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdCount, setCreatedCount] = useState<number | null>(null)
  const [expandedSnippets, setExpandedSnippets] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  const fetchExtractedTasks = async () => {
    setLoading(true)
    setError(null)
    setCreatedCount(null)
    setExpandedSnippets({})
    try {
      const response = await aiService.extractTasks(caseId)
      // Pre-select tasks that don't already exist in MongoDB Task collection
      const initialTasks = (response.tasks || []).map((t) => ({
        ...t,
        selected: !t.alreadyExists,
      }))
      setTasks(initialTasks)
    } catch (err: any) {
      console.error("Task extraction failed:", err)
      setError(err?.response?.data?.message || "Failed to extract tasks. Ensure AI service is active.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && tasks.length === 0 && !loading && createdCount === null) {
      fetchExtractedTasks()
    }
  }, [isOpen, caseId])

  const toggleSelect = (index: number) => {
    setTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, selected: !t.selected } : t))
    )
  }

  const toggleSelectAll = () => {
    const allSelected = tasks.every((t) => t.selected)
    setTasks((prev) => prev.map((t) => ({ ...t, selected: !allSelected })))
  }

  const toggleExpandSnippet = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedSnippets((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const handleCreateSelectedTasks = async () => {
    const selectedTasks = tasks.filter((t) => t.selected)
    if (selectedTasks.length === 0) return

    setIsSubmitting(true)
    setError(null)
    let count = 0

    try {
      for (const t of selectedTasks) {
        await createTask(caseId, {
          title: t.title,
          description: t.description || undefined,
          priority: t.priority || "medium",
          assignees: t.suggestedAssigneeId ? [t.suggestedAssigneeId] : undefined,
          dueDate: t.dueDate || null,
        })
        count++
      }
      setCreatedCount(count)
      onTasksCreated()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error("Failed to create tasks:", err)
      setError("Failed to create some tasks. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Standardized priority badge palette
  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "bg-rose-100 text-rose-800 border-rose-200/80 font-bold"
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200/80 font-bold"
      case "medium":
        return "bg-sky-100 text-sky-800 border-sky-200/80 font-semibold"
      case "low":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200/80 font-medium"
    }
  }

  // Truncate string cleanly at word boundary
  const truncateAtWordBoundary = (str: string, maxLen: number = 95) => {
    if (!str || str.length <= maxLen) return { text: str, canToggle: false }
    const truncated = str.slice(0, maxLen).replace(/\s+\S*$/, "")
    return { text: `${truncated}...`, canToggle: true }
  }

  const selectedCount = tasks.filter((t) => t.selected).length

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-task-extractor-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-start justify-between gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5B4CF3]/10 text-[#5B4CF3] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 id="ai-task-extractor-title" className="text-sm font-extrabold text-slate-900 leading-tight">
                  Extract Action Items
                </h2>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#5B4CF3]/10 text-[#5B4CF3] shrink-0">
                  AI Powered
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Review and create tasks directly into your Task Panel
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls Header Bar */}
        {tasks.length > 0 && !loading && createdCount === null && (
          <div className="px-3.5 sm:px-4 py-2 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2 text-xs shrink-0">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 font-bold text-[#5B4CF3] hover:underline cursor-pointer shrink-0 text-[11px]"
            >
              {tasks.every((t) => t.selected) ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" /> Select All ({tasks.length})
                </>
              )}
            </button>
            <span className="text-slate-500 font-semibold shrink-0 text-[10px] sm:text-[11px]">
              {selectedCount} of {tasks.length} selected
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 min-h-0 space-y-3 no-scrollbar">
          {/* Skeleton Loader */}
          {loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5B4CF3] mb-1 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing chat messages for pending action items...</span>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 bg-slate-200 rounded-md w-3/5" />
                    <div className="h-4 bg-slate-200 rounded-full w-14" />
                  </div>
                  <div className="h-3 bg-slate-200/70 rounded-md w-5/6" />
                  <div className="h-10 bg-slate-200/50 rounded-xl w-full" />
                  <div className="flex justify-between items-center pt-1">
                    <div className="h-3 bg-slate-200 rounded-md w-24" />
                    <div className="h-3 bg-slate-200 rounded-md w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Extraction Error</p>
                <p className="mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={fetchExtractedTasks}
                  className="mt-2 text-xs font-bold underline hover:no-underline cursor-pointer"
                >
                  Retry Extraction
                </button>
              </div>
            </div>
          )}

          {createdCount !== null && (
            <div className="text-center py-8 space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Successfully Created {createdCount} Task{createdCount !== 1 ? "s" : ""}!
              </h3>
              <p className="text-[11px] text-slate-500">Check your Task Panel on the right.</p>
            </div>
          )}

          {!loading && !error && createdCount === null && tasks.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs space-y-1">
              <p className="font-semibold text-slate-700">No Action Items Extracted</p>
              <p className="text-slate-500 text-[11px]">Chat messages contain no clear pending assignments.</p>
            </div>
          )}

          {!loading && !error && createdCount === null && tasks.length > 0 && (
            <div className="space-y-2.5">
              {tasks.map((t, idx) => {
                const isExpanded = !!expandedSnippets[idx]
                const snippetTruncation = t.sourceSnippet ? truncateAtWordBoundary(t.sourceSnippet, 95) : null

                return (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      t.selected
                        ? "bg-indigo-50/40 border-slate-200/90 shadow-2xs"
                        : "bg-white border-slate-200/80 hover:bg-slate-50/60"
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-[#5B4CF3] shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelect(idx)
                      }}
                    >
                      {t.selected ? (
                        <CheckSquare className="w-4 h-4 text-[#5B4CF3]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Header Row: Title & Priority Badge */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug flex-1 min-w-0 break-words">
                          {t.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap">
                          {t.alreadyExists && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              In Panel ({t.existingTaskStatus || "Active"})
                            </span>
                          )}
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${getPriorityBadgeStyle(
                            t.priority
                          )}`}>
                            {t.priority}
                          </span>
                        </div>
                      </div>

                      {/* Task Description */}
                      {t.description && (
                        <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                          {t.description}
                        </p>
                      )}

                      {/* Source Evidence Excerpt */}
                      {t.sourceSnippet && (
                        <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/70 text-[11px] text-slate-700 italic space-y-0.5 shadow-2xs">
                          <span className="text-[9px] font-bold uppercase text-slate-400 block not-italic">Source Message</span>
                          <p className="leading-relaxed">
                            "{isExpanded ? t.sourceSnippet : snippetTruncation?.text}"
                          </p>
                          {snippetTruncation?.canToggle && (
                            <button
                              type="button"
                              onClick={(e) => toggleExpandSnippet(idx, e)}
                              className="text-[10px] font-bold text-[#5B4CF3] hover:underline not-italic cursor-pointer pt-0.5 block"
                            >
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Assignee Avatar + Name */}
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 pt-0.5 flex-wrap gap-1.5">
                        {t.suggestedAssigneeName ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-slate-400 font-medium text-[10px]">Assignee:</span>
                            <div className="flex items-center gap-1.5">
                              <Avatar name={t.suggestedAssigneeName} size="xs" />
                              <span className="font-bold text-slate-800 text-[11px]">{t.suggestedAssigneeName}</span>
                            </div>
                          </div>
                        ) : <span />}

                        {t.dueDate && (
                          <span className="font-mono text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60 text-[9px]">
                            Due: {t.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/90 flex flex-row items-center gap-2.5 sm:gap-3 w-full shrink-0">
          <button
            type="button"
            onClick={fetchExtractedTasks}
            disabled={loading || isSubmitting}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
            <span>Re-extract</span>
          </button>

          {tasks.length > 0 && createdCount === null && (
            <button
              type="button"
              onClick={handleCreateSelectedTasks}
              disabled={isSubmitting || selectedCount === 0}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white bg-[#5B4CF3] hover:bg-[#4c3ed8] rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" /> <span>Creating...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Create ({selectedCount}) Tasks</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
