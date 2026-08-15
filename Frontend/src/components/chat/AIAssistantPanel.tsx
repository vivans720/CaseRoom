import { useEffect, useState, type JSX } from "react";
import { Sparkles, Plus, MessageSquare, ArrowUpRight, X, ArrowLeft, Clock } from "lucide-react";
import aiService, { type AIAnswer, type AICitation, type AIConversation } from "../../services/aiService";
import { AISummaryModal } from "./AISummaryModal";

interface Props {
  caseId?: string;
  onClose: () => void;
  onJumpToMessage?: (messageId: string) => void;
}

const formatTimeAgo = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatClockTime = (dateStr?: string): string => {
  const date = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

const ConfidenceBadge = ({ score }: { score: number }) => {
  const percentage = Math.round(score * 100);
  let colorStyle = "bg-rose-50 text-rose-700 border-rose-200";
  let tooltip = "Low confidence (<40%). Partial evidence match — verify against case timeline.";
  let icon = "⚠️";

  if (score >= 0.75) {
    colorStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
    tooltip = "High confidence (75%+). Grounded in multiple matching evidence sources.";
    icon = "✓";
  } else if (score >= 0.4) {
    colorStyle = "bg-amber-50 text-amber-700 border-amber-200";
    tooltip = "Moderate confidence (40-74%). Grounded in limited message context.";
    icon = "⚡";
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-help shrink-0 ${colorStyle}`}
      title={tooltip}
    >
      <span>{icon}</span>
      <span>{percentage}% Confidence</span>
    </div>
  );
};

export const AIAssistantPanel = ({ caseId, onClose, onJumpToMessage }: Props): JSX.Element => {
  const scope = caseId ? "case" : "knowledge";
  const [threads, setThreads] = useState<AIConversation[]>([]);
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Array<AIAnswer & { question: string; timestamp?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  useEffect(() => {
    aiService.listConversations(scope, caseId).then(setThreads).catch(() => setThreads([]));
  }, [scope, caseId]);

  const selectThread = async (id: string) => {
    try {
      const item = await aiService.getConversation(id);
      setConversation(item);
      const turns = item.turns || [];
      const restored: Array<AIAnswer & { question: string; timestamp?: string }> = [];
      for (let index = 0; index < turns.length; index += 2) {
        const userTurn = turns[index];
        const assistantTurn = turns[index + 1];
        if (userTurn?.role === "user" && assistantTurn?.role === "assistant") {
          restored.push({
            question: userTurn.content,
            answer: assistantTurn.content,
            citations: assistantTurn.citations || [],
            confidence: assistantTurn.confidence || 0,
            conversationId: item._id,
            timestamp: item.updatedAt,
          });
        }
      }
      setAnswers(restored);
    } catch {
      setError("Could not load conversation");
    }
  };

  const ask = async (customPrompt?: string) => {
    const textToAsk = customPrompt || question.trim();
    if (!textToAsk || loading) return;
    if (!customPrompt) setQuestion("");
    setLoading(true);
    setError("");
    const nowIso = new Date().toISOString();
    try {
      const response = await aiService.askCaseAssistant(caseId!, textToAsk, conversation?._id);
      setAnswers((previous) => [...previous, { ...response, question: textToAsk, timestamp: nowIso }]);
      if (!conversation) {
        const created = await aiService.getConversation(response.conversationId);
        setConversation(created);
        setThreads((previous) => [created, ...previous]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "AI assistant unavailable. Ensure AI backend service is running.");
    } finally {
      setLoading(false);
    }
  };

  const useCitation = (citation: AICitation) => {
    if (citation.sourceType === "message") onJumpToMessage?.(citation.sourceId);
    else if (citation.sourceType === "document") window.open(`/case/${citation.caseId}`, "_self");
  };

  return (
    <aside className="flex h-full w-full flex-col bg-white border-l border-slate-200 shadow-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/50">
        <div className="flex items-center space-x-2">
          {answers.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setConversation(null);
                setAnswers([]);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/80 hover:text-slate-900 transition-colors"
              title="Back to AI Home"
              aria-label="Back to AI Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-2 rounded-xl bg-[#5B4CF3] text-white">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
          <div>
            <h2 className="font-bold text-sm text-slate-900">{caseId ? "AI Case Assistant" : "Knowledge Assistant"}</h2>
            <p className="text-[11px] text-slate-500">Grounded evidence RAG reasoning</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          aria-label="Close AI Assistant"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top Actions Bar */}
      <div className="border-b border-slate-100 p-3 space-y-2 bg-slate-50/50">
        <div className="flex items-center gap-2">
          {caseId && (
            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Summary</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setConversation(null);
              setAnswers([]);
            }}
            className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Past Threads */}
        {threads.length > 0 && (
          <div className="mt-2 max-h-32 overflow-y-auto space-y-1 pr-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Past Threads</span>
            {threads.map((thread) => (
              <button
                key={thread._id}
                type="button"
                onClick={() => void selectThread(thread._id)}
                className={`flex items-center justify-between w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                  conversation?._id === thread._id
                    ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="truncate flex-1 min-w-0">{thread.title || "Untitled conversation"}</span>
                <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-normal flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {formatTimeAgo(thread.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {answers.length === 0 && (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className="text-xs font-bold text-slate-800">Ask AI anything about this case</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Query evidence, extracted dates, figures, witness statements, or generate full AI Case Summaries.
              </p>
            </div>
          </div>
        )}

        {answers.map((item, index) => (
          <div key={`${item.conversationId}-${index}`} className="space-y-2 text-xs">
            {/* User Question Bubble */}
            <div className="flex flex-col items-end gap-1">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-800 font-medium max-w-[90%]">
                {item.question}
              </div>
              <span className="text-[9px] text-slate-400 px-1 font-medium">
                {formatClockTime(item.timestamp)}
              </span>
            </div>

            {/* AI Response Card */}
            <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5 text-slate-900 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI Response</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.confidence !== undefined && (
                    <ConfidenceBadge score={item.confidence} />
                  )}
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatClockTime(item.timestamp)}
                  </span>
                </div>
              </div>

              {/* Answer Text Block */}
              <div className="prose prose-xs max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {item.answer}
              </div>

              {/* Sources & Grounded Evidence Section */}
              {item.citations && item.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Sources & Evidence ({item.citations.length})</span>
                    <span className="text-[10px] font-normal text-slate-400">Click to jump in chat</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {item.citations.map((citation, citationIndex) => (
                      <button
                        key={`${citation.sourceId}-${citationIndex}`}
                        type="button"
                        onClick={() => useCitation(citation)}
                        className="flex items-center justify-between w-full p-2 rounded-lg bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/60 transition-all text-left group cursor-pointer shadow-2xs"
                        title="Click to jump and highlight this message in main chat"
                      >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                          <span className="shrink-0 w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            [{citationIndex + 1}]
                          </span>
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {citation.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-indigo-600 font-bold text-[10px] pl-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Jump</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center space-x-2 text-xs text-indigo-700">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            <span className="font-medium">Retrieving grounded evidence & reasoning…</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
        className="border-t border-slate-100 p-3 bg-white"
      >
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask();
            }
          }}
          rows={3}
          placeholder={
            answers.length > 0
              ? "Ask a follow-up question in this thread..."
              : "Ask about evidence, dates, entities…"
          }
          className="w-full resize-none rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 placeholder:text-slate-400"
        />
        <button
          disabled={loading || !question.trim()}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40 transition-all shadow-xs active:scale-98"
        >
          Ask AI
        </button>
      </form>

      {caseId && (
        <AISummaryModal
          caseId={caseId}
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
        />
      )}
    </aside>
  );
};
