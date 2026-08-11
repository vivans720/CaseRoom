import { useEffect, useState, type JSX } from "react";
import aiService, { type AIInsight } from "../../services/aiService";
import { AlertTriangle, CheckCircle2, RefreshCw, X, ShieldAlert } from "lucide-react";
import { Spinner } from "../ui/Spinner";

interface Props {
  caseId: string;
  onClose: () => void;
}

export const AIInsightPanel = ({ caseId, onClose }: Props): JSX.Element => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchInsights = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await aiService.listInsights(caseId);
      setInsights(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load AI insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInsights();
  }, [caseId]);

  const handleScan = async () => {
    setScanning(true);
    setError("");
    setMessage("");
    try {
      await aiService.scanContradictions(caseId);
      setMessage("Contradiction scan queued. Results will appear shortly.");
      setTimeout(() => void fetchInsights(), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not start contradiction scan.");
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (insightId: string, status: "reviewed" | "dismissed") => {
    try {
      const updated = await aiService.updateInsight(insightId, status);
      setInsights((prev) => prev.map((item) => (item._id === insightId ? updated : item)));
    } catch {
      setError("Could not update finding status.");
    }
  };

  const activeInsights = insights.filter((item) => item.status !== "dismissed");

  return (
    <aside className="flex h-full w-full flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-slate-900">AI Contradictions</h2>
            <p className="text-[11px] text-slate-500">Cross-evidence fact verification engine</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Sub-header */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">
          Findings ({activeInsights.length})
        </span>
        <button
          type="button"
          onClick={() => void handleScan()}
          disabled={scanning}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-[#4c3ed8] hover:to-indigo-700 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
          <span>{scanning ? "Scanning…" : "Scan Case Facts"}</span>
        </button>
      </div>

      {/* Body List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {message && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : activeInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-200/60">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-800">No Contradictions Detected</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              AI scanned messages and documents in this case. All claims align consistently.
            </p>
          </div>
        ) : (
          activeInsights.map((insight) => (
            <div
              key={insight._id}
              className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 shadow-2xs space-y-2"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                    {insight.title}
                  </h3>
                  {insight.confidence && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/60">
                      {Math.round(insight.confidence * 100)}% Confidence
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-amber-100">
                {insight.description}
              </p>

              {insight.sources && insight.sources.length > 0 && (
                <div className="text-[11px] font-medium text-slate-500 pt-1 space-y-1">
                  <span className="font-bold text-slate-600">Conflicting Sources:</span>
                  {insight.sources.map((src, i) => (
                    <div key={i} className="truncate text-indigo-700 bg-indigo-50/70 px-2 py-1 rounded-lg">
                      • {src.sourceType}: {src.segment || src.sourceId}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/80">
                <button
                  type="button"
                  onClick={() => void handleUpdateStatus(insight._id, "reviewed")}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    insight.status === "reviewed"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {insight.status === "reviewed" ? "Reviewed ✓" : "Mark Reviewed"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpdateStatus(insight._id, "dismissed")}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-500 hover:bg-amber-100/80 hover:text-slate-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
