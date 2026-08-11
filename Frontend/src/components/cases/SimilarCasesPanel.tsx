import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, ExternalLink, RefreshCw } from "lucide-react"
import aiService, { type SimilarCaseItem } from "../../services/aiService"

interface SimilarCasesPanelProps {
  caseId: string
  onClose?: () => void
}

export const SimilarCasesPanel = ({ caseId, onClose }: SimilarCasesPanelProps) => {
  const [cases, setCases] = useState<SimilarCaseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  const fetchSimilar = async () => {
    if (!caseId) return
    setLoading(true)
    setError(false)
    try {
      const data = await aiService.getSimilarCases(caseId)
      setCases(data)
    } catch (err) {
      console.error("Failed to fetch similar cases:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSimilar()
  }, [caseId])

  if (loading) {
    return (
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-[#5B4CF3] animate-pulse" />
            <span>Similar Cases Recommendation</span>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xs">✕</button>
          )}
        </div>
        <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#5B4CF3]" />
          Finding matching cases...
        </div>
      </div>
    )
  }

  if (error || cases.length === 0) {
    if (onClose) {
      return (
        <div className="p-4 bg-white h-full border-l border-slate-200">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="font-extrabold text-sm text-slate-900">Similar Cases</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
          <p className="text-xs text-slate-500 text-center py-8">No similar cases found in ChromaDB vector index.</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`p-4 ${onClose ? "h-full bg-white border-l border-slate-200" : "rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 shadow-xs"} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
          <div className="w-6 h-6 rounded-lg bg-[#5B4CF3]/10 text-[#5B4CF3] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span>Similar Cases</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400">AI Recommendation</span>
          {onClose && (
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xs">✕</button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {cases.map((c) => (
          <div
            key={c._id}
            onClick={() => navigate(`/case/${c._id}`)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-[#5B4CF3]/50 hover:shadow-sm transition-all cursor-pointer group flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#5B4CF3] transition-colors">
                  {c.title}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-extrabold text-[#5B4CF3] bg-[#5B4CF3]/10 px-2 py-0.5 rounded-full">
                  {c.similarityPercentage}% Match
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#5B4CF3] transition-colors" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">
                {c.status || "Open"}
              </span>
              {c.category && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-medium text-slate-600 dark:text-slate-400">
                  {c.category}
                </span>
              )}
            </div>

            {c.matchReasons && c.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1 border-t border-slate-100 dark:border-slate-700/50 pt-1.5 mt-0.5">
                {c.matchReasons.map((reason, idx) => (
                  <span key={idx} className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                    • {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
