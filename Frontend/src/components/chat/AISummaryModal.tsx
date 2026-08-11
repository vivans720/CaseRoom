import { useState } from "react"
import { Sparkles, X, AlertCircle, CheckCircle2, Clock, FileText, RefreshCw } from "lucide-react"
import aiService, { type ChatSummaryData } from "../../services/aiService"

interface AISummaryModalProps {
  caseId: string
  isOpen: boolean
  onClose: () => void
}

export const AISummaryModal = ({ caseId, isOpen, onClose }: AISummaryModalProps) => {
  const [loading, setLoading] = useState(false)
  const [summaryData, setSummaryData] = useState<ChatSummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateSummary = async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await aiService.getChatSummary(caseId, force)
      setSummaryData(data)
    } catch (err: any) {
      console.error("Failed to generate summary:", err)
      setError(err?.response?.data?.message || "Failed to generate AI summary. Ensure Ollama local service is running.")
    } finally {
      setLoading(false)
    }
  }

  const getItemText = (item: string | { text: string }) => {
    return typeof item === "string" ? item : item.text
  }

  if (!isOpen) return null

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
                AI Case Summary
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5B4CF3]/10 text-[#5B4CF3]">
                  Gemma 3:4B
                </span>
                {summaryData?.cached && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Cached (Instant)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated investigation breakdown
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!summaryData && !loading && !error && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#5B4CF3]/10 text-[#5B4CF3] mx-auto flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Generate Summary
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Click below to synthesize all case messages, decisions, and action items using local AI.
                </p>
              </div>
              <button
                onClick={() => handleGenerateSummary(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B4CF3] hover:bg-[#4c3ed8] text-white text-xs font-bold transition-all shadow-md shadow-[#5B4CF3]/20 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Generate AI Summary
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-14 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#5B4CF3] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Analyzing messages with Gemma 3:4B...
              </p>
              <p className="text-[11px] text-slate-400">
                Evaluating schema & evidence chunks
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Summary Generation Failed</p>
                <p className="mt-0.5">{error}</p>
                <button
                  onClick={() => handleGenerateSummary(true)}
                  className="mt-3 text-xs font-bold underline hover:no-underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {summaryData && !loading && (
            <div className="space-y-5">
              {/* Overview Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Overview
                </h3>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {summaryData.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Issues */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Reported Issues
                  </h4>
                  {summaryData.issues && summaryData.issues.length > 0 ? (
                    <ul className="space-y-1.5">
                      {summaryData.issues.map((item, idx) => (
                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          {getItemText(item)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific issues identified</p>
                  )}
                </div>

                {/* Decisions */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Decisions Made
                  </h4>
                  {summaryData.decisions && summaryData.decisions.length > 0 ? (
                    <ul className="space-y-1.5">
                      {summaryData.decisions.map((item, idx) => (
                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          {getItemText(item)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No key decisions recorded</p>
                  )}
                </div>
              </div>

              {/* Pending Work */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Action Items
                </h4>
                {summaryData.pendingWork && summaryData.pendingWork.length > 0 ? (
                  <ul className="space-y-1.5">
                    {summaryData.pendingWork.map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        {getItemText(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No pending items found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {summaryData?.messageCount ? `Summarized ${summaryData.messageCount} messages` : "Powered by Ollama (Gemma 3:4B)"}
          </span>
          {summaryData && (
            <button
              onClick={() => handleGenerateSummary(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Force Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
