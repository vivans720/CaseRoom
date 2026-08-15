import { useState, useEffect, type JSX } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";
import aiService, { type ChatSummaryData } from "../../services/aiService";

interface AISummaryModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AISummaryModal = ({
  caseId,
  isOpen,
  onClose,
}: AISummaryModalProps): JSX.Element | null => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<ChatSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Escape key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleGenerateSummary = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.getChatSummary(caseId, forceRefresh);
      setSummaryData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to generate AI summary. Ensure AI service is active.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/10 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5B4CF3] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                AI Case Summary
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-[#5B4CF3] border border-purple-100">
                  AI Powered
                </span>
                {summaryData?.cached && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Cached (Instant)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Automated investigation breakdown
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
          {!summaryData && !loading && !error && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#5B4CF3] mx-auto flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-slate-900">
                  Generate Summary
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Click below to synthesize all case messages, decisions, and action items using AI.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateSummary(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B4CF3] hover:bg-[#4c3ed8] text-white text-xs font-bold transition-all shadow-md shadow-[#5B4CF3]/20 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Generate AI Summary
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-14 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#5B4CF3] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Analyzing messages with AI...
              </p>
              <p className="text-[11px] text-slate-400">
                Evaluating schema & evidence chunks
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Summary Generation Failed</p>
                <p className="mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={() => handleGenerateSummary(true)}
                  className="mt-3 text-xs font-bold text-rose-900 underline hover:no-underline cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {summaryData && (
            <div className="space-y-6">
              {/* Executive Overview */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/90 space-y-2">
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#5B4CF3]" />
                  Executive Summary
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {summaryData.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Key Issues */}
                {summaryData.issues && summaryData.issues.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200/70 space-y-2.5">
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Key Issues ({summaryData.issues.length})
                    </h3>
                    <ul className="space-y-1.5">
                      {summaryData.issues.map((item, idx) => {
                        const text =
                          typeof item === "string" ? item : item.text;
                        return (
                          <li
                            key={idx}
                            className="text-xs text-slate-700 font-medium flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Key Decisions */}
                {summaryData.decisions && summaryData.decisions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200/70 space-y-2.5">
                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Decisions Made ({summaryData.decisions.length})
                    </h3>
                    <ul className="space-y-1.5">
                      {summaryData.decisions.map((item, idx) => {
                        const text =
                          typeof item === "string" ? item : item.text;
                        return (
                          <li
                            key={idx}
                            className="text-xs text-slate-700 font-medium flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Pending Work & Action Items */}
              {summaryData.pendingWork && summaryData.pendingWork.length > 0 && (
                <div className="p-4 rounded-2xl bg-purple-50/30 border border-purple-200/70 space-y-2.5">
                  <h3 className="text-xs font-bold text-[#5B4CF3] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Work ({summaryData.pendingWork.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {summaryData.pendingWork.map((item, idx) => {
                      const text =
                        typeof item === "string" ? item : item.text;
                      return (
                        <li
                          key={idx}
                          className="text-xs text-slate-700 font-medium flex items-start gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5B4CF3] shrink-0 mt-1.5" />
                          <span>{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            {summaryData?.messageCount
              ? `Summarized ${summaryData.messageCount} messages`
              : "Powered by CaseRoom AI"}
          </span>
          {summaryData && (
            <button
              type="button"
              onClick={() => handleGenerateSummary(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Force Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
