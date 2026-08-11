import { useState, useEffect } from "react"
import { Sparkles, X, CheckSquare, Square, AlertCircle, RefreshCw, PlusCircle, Check } from "lucide-react"
import aiService, { type ExtractedTask } from "../../services/aiService"
import { createTask } from "../../services/taskService"
import { Spinner } from "../ui/Spinner"

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

  const fetchExtractedTasks = async () => {
    setLoading(true)
    setError(null)
    setCreatedCount(null)
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
      setError(err?.response?.data?.message || "Failed to extract tasks. Ensure Ollama service is running.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && tasks.length === 0 && !loading && createdCount === null) {
      fetchExtractedTasks()
    }
  }, [isOpen, caseId])

  if (!isOpen) return null

  const toggleSelect = (index: number) => {
    setTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, selected: !t.selected } : t))
    )
  }

  const toggleSelectAll = () => {
    const allSelected = tasks.every((t) => t.selected)
    setTasks((prev) => prev.map((t) => ({ ...t, selected: !allSelected })))
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
                Extract Action Items with AI
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5B4CF3]/10 text-[#5B4CF3]">
                  Gemma 3:4B
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review and create tasks directly into your Task Panel
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

        {/* Controls header */}
        {tasks.length > 0 && !loading && createdCount === null && (
          <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold text-[#5B4CF3] hover:underline"
            >
              {tasks.every((t) => t.selected) ? (
                <>
                  <CheckSquare className="w-4 h-4" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" /> Select All ({tasks.length})
                </>
              )}
            </button>
            <span className="text-xs text-slate-500 font-medium">
              {tasks.filter((t) => t.selected).length} of {tasks.length} selected
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="text-center py-14 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#5B4CF3] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Analyzing chat for pending tasks with Gemma 3:4B...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Extraction Error</p>
                <p className="mt-0.5">{error}</p>
                <button
                  onClick={fetchExtractedTasks}
                  className="mt-3 text-xs font-bold underline hover:no-underline"
                >
                  Retry Extraction
                </button>
              </div>
            </div>
          )}

          {createdCount !== null && (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Successfully Created {createdCount} Task{createdCount !== 1 ? "s" : ""}!
              </h3>
              <p className="text-xs text-slate-500">Check your Task Panel on the right.</p>
            </div>
          )}

          {!loading && !error && createdCount === null && tasks.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <p className="font-semibold text-slate-600 dark:text-slate-300">No Action Items Extracted</p>
              <p>Chat messages contain no clear pending assignments.</p>
            </div>
          )}

          {!loading && !error && createdCount === null && tasks.length > 0 && (
            <div className="space-y-3">
              {tasks.map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    t.selected
                      ? "border-[#5B4CF3]/60 bg-purple-50/40 dark:bg-slate-800/80 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 opacity-60 hover:opacity-100"
                  }`}
                >
                  <button
                    type="button"
                    className="mt-0.5 text-[#5B4CF3] shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSelect(idx)
                    }}
                  >
                    {t.selected ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {t.title}
                      </h4>
                      <div className="flex items-center gap-1.5">
                        {t.alreadyExists && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            Already in Task Panel ({t.existingTaskStatus || "Active"})
                          </span>
                        )}
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          t.priority === "critical"
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : t.priority === "high"
                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {t.description}
                      </p>
                    )}

                    {t.sourceSnippet && (
                      <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic">
                        "{t.sourceSnippet}"
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 pt-0.5">
                      {t.suggestedAssigneeName ? (
                        <span>
                          Assignee: <span className="font-bold text-slate-700 dark:text-slate-300">{t.suggestedAssigneeName}</span>
                        </span>
                      ) : <span />}

                      {t.dueDate && (
                        <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                          Due: {t.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            onClick={fetchExtractedTasks}
            disabled={loading || isSubmitting}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-extract
          </button>

          {tasks.length > 0 && createdCount === null && (
            <button
              onClick={handleCreateSelectedTasks}
              disabled={isSubmitting || tasks.filter((t) => t.selected).length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] hover:from-[#4c3ed8] hover:to-[#7a25e6] text-white text-xs font-bold transition-all shadow-md shadow-[#5B4CF3]/20 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" /> Creating Tasks...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" /> Create Selected ({tasks.filter((t) => t.selected).length}) Tasks
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
