import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, ExternalLink, RefreshCw, X, FolderSearch, ArrowRight } from "lucide-react"
import aiService, { type SimilarCaseItem } from "../../services/aiService"
import { Spinner } from "../ui/Spinner"

interface SimilarCasesPanelProps {
  caseId: string
  onClose?: () => void
}

const getStatusStyle = (status?: string) => {
  switch (status) {
    case "Open":
      return { badge: "bg-rose-50 text-rose-700 border-rose-200/80 font-semibold", dot: "bg-rose-500", label: "Open" }
    case "In Progress":
      return { badge: "bg-amber-50 text-amber-700 border-amber-200/80 font-semibold", dot: "bg-amber-500", label: "In Progress" }
    case "Under Review":
      return { badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80 font-semibold", dot: "bg-indigo-500", label: "Under Review" }
    case "Resolved":
      return { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold", dot: "bg-emerald-500", label: "Resolved" }
    case "Closed":
    case "archived":
      return { badge: "bg-slate-100 text-slate-600 border-slate-200/80 font-medium", dot: "bg-slate-400", label: "Closed" }
    case "active":
    default:
      return { badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold", dot: "bg-emerald-500", label: "Active" }
  }
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
      setCases(data || [])
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 space-y-3">
          <Spinner size="md" />
          <p className="text-xs font-semibold text-slate-600">Analyzing vector embeddings…</p>
          <p className="text-[11px] text-slate-400">Searching ChromaDB for semantic matches</p>
        </div>
      )
    }

    if (error || cases.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/80 text-[#5B4CF3] flex items-center justify-center shadow-2xs">
            <FolderSearch className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">No Similar Cases Found</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              No existing cases meet the semantic similarity threshold for this investigation.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSimilar}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B4CF3] hover:underline cursor-pointer pt-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-analyze</span>
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-2.5">
        {cases.map((c) => {
          const statusInfo = getStatusStyle(c.status)
          const isHighMatch = c.similarityPercentage >= 85
          const isMidMatch = c.similarityPercentage >= 70

          return (
            <div
              key={c._id}
              onClick={() => navigate(`/case/${c._id}`)}
              className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#5B4CF3]/70 hover:shadow-md hover:bg-slate-50/40 transition-all duration-200 cursor-pointer group flex flex-col gap-2 shadow-2xs"
            >
              {/* Card Header: Title & Match Badge */}
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#5B4CF3] transition-colors leading-snug break-words flex-1 min-w-0">
                  {c.title}
                </h4>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
                      isHighMatch
                        ? "bg-rose-50 text-rose-700 border-rose-200/80"
                        : isMidMatch
                        ? "bg-purple-50 text-[#5B4CF3] border-purple-200/80"
                        : "bg-sky-50 text-sky-700 border-sky-200/80"
                    }`}
                  >
                    {c.similarityPercentage}% Match
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#5B4CF3] transition-colors shrink-0" />
                </div>
              </div>

              {/* Status & Category Metadata */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${statusInfo.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                  {statusInfo.label}
                </span>
                {c.category && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70 font-semibold">
                    {c.category}
                  </span>
                )}
              </div>

              {/* Match Reasons */}
              {c.matchReasons && c.matchReasons.length > 0 && (
                <div className="border-t border-slate-100 pt-2 flex flex-wrap gap-1.5">
                  {c.matchReasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200/60"
                    >
                      <span className="w-1 h-1 rounded-full bg-[#5B4CF3]" />
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Sidebar Layout
  if (onClose) {
    return (
      <aside className="flex h-full w-full flex-col bg-white border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#5B4CF3]/10 text-[#5B4CF3] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900">Similar Cases</h2>
              <p className="text-[11px] text-slate-500">AI vector similarity recommendations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-header Controls */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-slate-700">
            {loading ? "Searching database…" : `${cases.length} Match${cases.length !== 1 ? "es" : ""}`}
          </span>
          <button
            type="button"
            onClick={fetchSimilar}
            disabled={loading}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5B4CF3] hover:underline disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {renderContent()}
        </div>
      </aside>
    )
  }

  // Embedded (Settings) Layout
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#5B4CF3]/10 text-[#5B4CF3] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Similar Cases</h4>
            <p className="text-[10px] text-slate-500">Vector similarity matches</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchSimilar}
          disabled={loading}
          className="text-slate-400 hover:text-[#5B4CF3] transition-colors p-1"
          title="Refresh similar cases"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div>{renderContent()}</div>
    </div>
  )
}
