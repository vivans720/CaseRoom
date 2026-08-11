import { useEffect, useState, type JSX } from "react";
import { getMeetingHistory, updateMeetingTranscript, type MeetingHistoryItem } from "../../services/meetingService";
import aiService, { type MeetingSummaryData, type MeetingActionItem } from "../../services/aiService";
import { createTask } from "../../services/taskService";
import { Avatar } from "../ui/Avatar";
import { Sparkles, CheckCircle2, AlertCircle, Clock, Plus, X } from "lucide-react";

interface MeetingHistoryPanelProps {
  caseId: string;
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDurationStr = (startStr: string, endStr?: string): string => {
  if (!endStr) return "In progress";
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const diffMs = Math.max(0, end - start);
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export const MeetingHistoryPanel = ({ caseId }: MeetingHistoryPanelProps): JSX.Element => {
  const [history, setHistory] = useState<MeetingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<{ meeting: MeetingHistoryItem; summary: MeetingSummaryData } | null>(null);
  const [createdTasks, setCreatedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!caseId) return;
    setIsLoading(true);
    getMeetingHistory(caseId)
      .then((data) => {
        setHistory(data);
      })
      .catch((err) => {
        console.error("Failed to load meeting history:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [caseId]);

  const saveTranscript = async (meetingId: string) => {
    try {
      const updated = await updateMeetingTranscript(caseId, meetingId, transcript);
      setHistory((items) => items.map((item) => (item._id === meetingId ? updated : item)));
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save meeting notes:", error);
    }
  };

  const handleSummarizeMeeting = async (item: MeetingHistoryItem) => {
    setSummarizingId(item._id);
    try {
      const data = await aiService.getMeetingSummary(caseId, item._id, item.transcript);
      setSelectedSummary({ meeting: item, summary: data });
    } catch (error) {
      console.error("Failed to summarize meeting:", error);
    } finally {
      setSummarizingId(null);
    }
  };

  const handleCreateTaskFromAction = async (action: MeetingActionItem | string, idx: number) => {
    const taskTitle = typeof action === "string" ? action : action.task;
    const priority = (typeof action !== "string" && action.priority) || "medium";
    
    try {
      await createTask(caseId, {
        title: taskTitle,
        description: `Auto-created from AI Meeting Summary for call on ${formatDate(selectedSummary?.meeting.startedAt || "")}`,
        priority,
      });
      setCreatedTasks((prev) => ({ ...prev, [idx]: true }));
    } catch (err) {
      console.error("Failed to convert meeting action item to task:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-text-tertiary">
        Loading meeting history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-text-tertiary gap-2">
        <span className="text-2xl">📹</span>
        <span className="text-xs font-medium">No past meetings recorded for this case yet.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary px-1">
        Past Video Meetings ({history.length})
      </h3>

      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item._id}
            className="p-3 rounded-xl bg-surface-secondary border border-border/60 hover:border-primary/30 transition-colors flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">
                  📹
                </div>
                <span className="text-xs font-bold text-text-primary">
                  Meeting by {item.startedBy?.name || "User"}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-text-tertiary bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {getDurationStr(item.startedAt, item.endedAt)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-secondary border-t border-border/40 pt-2 mt-0.5">
              <span>{formatDate(item.startedAt)}</span>
              <div className="flex items-center gap-1">
                <span>{item.participants.length} attended</span>
                <div className="flex -space-x-1 ml-1">
                  {item.participants.slice(0, 3).map((p, idx) => (
                    <Avatar
                      key={idx}
                      name={p.user?.name || "User"}
                      src={p.user?.profilePictureUrl}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            </div>

            {editingId === item._id ? (
              <div className="space-y-2">
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  rows={4}
                  placeholder="Paste speaker-attributed transcript (e.g. [00:02] Alex: We need to verify Zurich IP...)"
                  className="w-full rounded-lg border border-border bg-white dark:bg-slate-900 p-2 text-xs text-text-primary"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveTranscript(item._id)}
                    className="rounded bg-primary px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                  >
                    Save notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-text-secondary hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item._id);
                    setTranscript(item.transcript || "");
                  }}
                  className="text-left text-xs font-semibold text-primary hover:underline"
                >
                  {item.transcript ? "Edit transcript/notes" : "Add transcript/notes"}
                </button>
                
                <button
                  type="button"
                  onClick={() => handleSummarizeMeeting(item)}
                  disabled={summarizingId === item._id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${summarizingId === item._id ? "animate-spin" : ""}`} />
                  {summarizingId === item._id ? "Summarizing..." : "AI Summary"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Meeting Summary Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  AI Meeting Breakdown
                </h3>
              </div>
              <button
                onClick={() => setSelectedSummary(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Executive Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Executive Summary
                </h4>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedSummary.summary.summary}
                </p>
              </div>

              {/* Key Topics & Discussion */}
              {selectedSummary.summary.keyTopics && selectedSummary.summary.keyTopics.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                    Key Topics Covered
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSummary.summary.keyTopics.map((topic, i) => (
                      <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Decisions */}
              {selectedSummary.summary.decisions && selectedSummary.summary.decisions.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Decisions Made
                  </h4>
                  <ul className="space-y-1">
                    {selectedSummary.summary.decisions.map((dec, i) => {
                      const text = typeof dec === "string" ? dec : dec.decision;
                      const madeBy = typeof dec !== "string" ? dec.madeBy : null;
                      const ts = typeof dec !== "string" ? dec.timestamp : null;
                      return (
                        <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-200/40 dark:border-emerald-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <span>{text}</span>
                            {(madeBy || ts) && (
                              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                {madeBy && `By ${madeBy}`} {ts && `• Timestamp ${ts}`}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Action Items with 1-Click Task Creation */}
              {selectedSummary.summary.actionItems && selectedSummary.summary.actionItems.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Action Items & Assigned Tasks
                  </h4>
                  <div className="space-y-1.5">
                    {selectedSummary.summary.actionItems.map((act, idx) => {
                      const taskText = typeof act === "string" ? act : act.task;
                      const assignee = typeof act !== "string" ? act.assignee : null;
                      const isCreated = createdTasks[idx];

                      return (
                        <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-800 dark:text-slate-200 font-medium flex-1">
                            <p>{taskText}</p>
                            {assignee && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                Assigned to: {assignee}
                              </span>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleCreateTaskFromAction(act, idx)}
                            disabled={isCreated}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                              isCreated
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-primary text-white hover:bg-primary-dark shadow-xs"
                            }`}
                          >
                            {isCreated ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Task Created
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                Add Task
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
