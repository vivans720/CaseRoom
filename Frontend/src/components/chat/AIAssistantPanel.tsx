import { useEffect, useState, type JSX } from "react";
import { Sparkles, Plus, MessageSquare, AlertTriangle, ArrowUpRight, X } from "lucide-react";
import aiService, { type AIAnswer, type AICitation, type AIConversation, type AIInsight } from "../../services/aiService";
import { AISummaryModal } from "./AISummaryModal";

interface Props {
  caseId?: string;
  onClose: () => void;
  onJumpToMessage?: (messageId: string) => void;
}

export const AIAssistantPanel = ({ caseId, onClose, onJumpToMessage }: Props): JSX.Element => {
  const scope = caseId ? "case" : "knowledge";
  const [threads, setThreads] = useState<AIConversation[]>([]);
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Array<AIAnswer & { question: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  useEffect(() => {
    aiService.listConversations(scope, caseId).then(setThreads).catch(() => setThreads([]));
    if (caseId) aiService.listInsights(caseId).then(setInsights).catch(() => setInsights([]));
  }, [scope, caseId]);

  const scanContradictions = async () => {
    if (!caseId) return;
    try {
      await aiService.scanContradictions(caseId);
      setError("Contradiction scan queued. Findings appear after indexing completes.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not start contradiction scan");
    }
  };

  const updateInsight = async (insightId: string, status: "reviewed" | "dismissed") => {
    try {
      const changed = await aiService.updateInsight(insightId, status);
      setInsights((all) => all.map((item) => (item._id === insightId ? changed : item)));
    } catch {
      setError("Could not update finding");
    }
  };

  const selectThread = async (id: string) => {
    try {
      const item = await aiService.getConversation(id);
      setConversation(item);
      const turns = item.turns || [];
      const restored: Array<AIAnswer & { question: string }> = [];
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
    try {
      const response = caseId
        ? await aiService.askCaseAssistant(caseId, textToAsk, conversation?._id)
        : await aiService.askKnowledge(textToAsk, conversation?._id);
      setAnswers((previous) => [...previous, { ...response, question: textToAsk }]);
      if (!conversation) {
        const created = await aiService.getConversation(response.conversationId);
        setConversation(created);
        setThreads((previous) => [created, ...previous]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "AI assistant unavailable. Ensure Ollama and ChromaDB are running.");
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
          <div className="p-2 rounded-xl bg-[#5B4CF3] text-white">
            <Sparkles className="w-4 h-4" />
          </div>
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

      {/* Top AI Actions Bar: AI Summary + New Conversation */}
      <div className="border-b border-slate-100 p-3 space-y-2 bg-slate-50/30">
        <div className="grid grid-cols-2 gap-2">
          {caseId && (
            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-indigo-600 hover:from-[#4c3ed8] hover:to-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
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
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              !caseId ? "col-span-2" : ""
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {threads.length > 0 && (
          <div className="mt-2 max-h-28 overflow-y-auto space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Past Threads</span>
            {threads.map((thread) => (
              <button
                key={thread._id}
                type="button"
                onClick={() => void selectThread(thread._id)}
                className={`block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                  conversation?._id === thread._id
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {thread.title || "Untitled conversation"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {answers.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className="text-xs font-bold text-slate-800">Ask AI anything about this case</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Query evidence, extracted dates, figures, witness statements, or generate full AI Case Summaries.
              </p>
            </div>
          </div>
        )}

        {answers.map((item, index) => (
          <div key={`${item.conversationId}-${index}`} className="space-y-2 text-xs">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-800 font-medium ml-4">
              {item.question}
            </div>
            <div className="rounded-xl bg-indigo-50/80 border border-indigo-100 p-3 text-slate-900 space-y-2">
              <div className="prose prose-xs max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
                {item.answer}
              </div>
              {item.citations && item.citations.length > 0 && (
                <div className="pt-2 border-t border-indigo-100/80 flex flex-wrap gap-1">
                  {item.citations.map((citation, citationIndex) => (
                    <button
                      key={`${citation.sourceId}-${citationIndex}`}
                      type="button"
                      onClick={() => useCitation(citation)}
                      className="inline-flex items-center gap-1 rounded-md bg-white border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      <span>[{citationIndex + 1}] {citation.label}</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center space-x-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
            <span>Retrieving grounded evidence & reasoning…</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Contradictions Section */}
        {caseId && (
          <section className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Potential Contradictions</span>
              </h3>
              <button
                type="button"
                onClick={() => void scanContradictions()}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Scan
              </button>
            </div>
            {insights.filter((item) => item.status !== "invalidated").length === 0 ? (
              <p className="text-[11px] text-slate-400 italic mt-1">No active contradictions found.</p>
            ) : (
              insights
                .filter((item) => item.status !== "invalidated")
                .map((item) => (
                  <div key={item._id} className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs">
                    <p className="font-semibold text-amber-900">{item.title}</p>
                    <p className="mt-1 text-slate-600 text-[11px]">{item.description}</p>
                    <div className="mt-2 space-x-2">
                      <button
                        type="button"
                        onClick={() => void updateInsight(item._id, "reviewed")}
                        className="font-semibold text-indigo-700 hover:underline"
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateInsight(item._id, "dismissed")}
                        className="text-slate-500 hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
            )}
          </section>
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
          placeholder="Ask about evidence, dates, entities…"
          className="w-full resize-none rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
        />
        <button
          disabled={loading || !question.trim()}
          className="mt-2 w-full rounded-xl bg-[#5B4CF3] hover:bg-[#4c3ed8] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors shadow-xs"
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
