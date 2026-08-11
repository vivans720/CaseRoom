import { useState, type JSX } from "react";
import { Sparkles, FileText, Send, AlertCircle, Bookmark } from "lucide-react";
import aiService, { type AIAnswer } from "../../services/aiService";

interface DocumentQAPanelProps {
  caseId: string;
  messageId?: string;
  onClose?: () => void;
}

export const DocumentQAPanel = ({
  caseId,
  messageId,
}: DocumentQAPanelProps): JSX.Element | null => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AIAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!messageId) return null;

  const askQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await aiService.askDocument(caseId, messageId, queryText.trim());
      setAnswer(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Document is not indexed yet or unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleAskSummary = () => {
    const summaryPrompt = "Summarize this document in detail and list all key findings, figures, and action items.";
    setQuestion(summaryPrompt);
    void askQuery(summaryPrompt);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Document Assistant</h3>
            <p className="text-[11px] text-slate-400">Grounded Q&A over this document</p>
          </div>
        </div>
      </div>

      {/* Quick Action Preset Prompts (Includes "Ask Summary") */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Quick Actions</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleAskSummary}
            className="flex items-center space-x-1.5 p-2 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/60 text-xs font-medium text-indigo-200 transition-colors text-left disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">✨ Ask Summary</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              const actionPrompt = "What specific action items, tasks, or follow-ups are requested in this document?";
              setQuestion(actionPrompt);
              void askQuery(actionPrompt);
            }}
            className="flex items-center space-x-1.5 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors text-left disabled:opacity-50"
          >
            <Bookmark className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">Extract Actions</span>
          </button>
        </div>
      </div>

      {/* Question Input */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">
          Ask any custom question:
        </label>
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void askQuery(question);
              }
            }}
            rows={3}
            placeholder="Ask about dates, totals, names, or clauses in this file…"
            className="w-full resize-none rounded-lg bg-slate-950 border border-slate-700/80 p-3 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            disabled={loading || !question.trim()}
            onClick={() => void askQuery(question)}
            className="absolute right-2.5 bottom-2.5 p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center space-y-2">
          <div className="inline-block animate-spin text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Analyzing document with Gemma 3:4B RAG…</p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 flex items-start space-x-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Answer & Citation Card */}
      {answer && !loading && (
        <div className="flex-1 overflow-y-auto space-y-3 rounded-lg bg-slate-950/80 border border-indigo-900/50 p-3 text-xs text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-indigo-300">AI Response</span>
            {answer.confidence && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                {Math.round(answer.confidence * 100)}% Confidence
              </span>
            )}
          </div>

          <div className="prose prose-invert prose-xs max-w-none space-y-1.5 leading-relaxed text-slate-200 whitespace-pre-wrap">
            {answer.answer}
          </div>

          {/* Citations */}
          {answer.citations && answer.citations.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Evidence Citations</span>
              <div className="space-y-1">
                {answer.citations.map((cit, idx) => (
                  <div key={`${cit.sourceId}-${idx}`} className="text-[11px] text-indigo-300 bg-indigo-950/40 px-2 py-1 rounded border border-indigo-900/60 truncate">
                    [{idx + 1}] {cit.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
