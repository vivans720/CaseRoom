import { useEffect, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import {
  getMeetingHistory,
  updateMeetingTranscript,
  type MeetingHistoryItem,
} from "../../services/meetingService";
import aiService, {
  type MeetingSummaryData,
  type MeetingActionItem,
} from "../../services/aiService";
import { createTask } from "../../services/taskService";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  X,
  Video,
  RefreshCw,
  FileText,
  Copy,
  Check,
  AlignLeft,
  Users,
  Calendar,
  MessageSquare,
  Pencil,
  ArrowRight,
} from "lucide-react";

interface MeetingHistoryPanelProps {
  caseId: string;
  onClose?: () => void;
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

export const MeetingHistoryPanel = ({
  caseId,
  onClose,
}: MeetingHistoryPanelProps): JSX.Element => {
  const [history, setHistory] = useState<MeetingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected meeting & modal state
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingHistoryItem | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<MeetingSummaryData | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"summary" | "transcript">("summary");

  // Transcript editing inside modal
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Clipboard copy and task states
  const [copied, setCopied] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [createdTasks, setCreatedTasks] = useState<Record<string, boolean>>({});

  const fetchHistory = async () => {
    if (!caseId) return;
    setIsLoading(true);
    try {
      const data = await getMeetingHistory(caseId);
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to load meeting history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, [caseId]);

  // Lock body scroll and handle Escape key for modal
  useEffect(() => {
    if (!selectedMeeting) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedMeeting(null);
        setSelectedSummary(null);
        setIsEditingNotes(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedMeeting]);

  const handleOpenMeetingModal = async (
    item: MeetingHistoryItem,
    initialTab: "summary" | "transcript" = "summary",
  ) => {
    setSelectedMeeting(item);
    setActiveModalTab(initialTab);
    setIsEditingNotes(false);
    setNotesValue(item.transcript || "");
    setCopied(false);
    setCopiedTranscript(false);

    setIsSummarizing(true);
    try {
      const data = await aiService.getMeetingSummary(
        caseId,
        item._id,
        item.transcript,
      );
      setSelectedSummary(data);
    } catch (error) {
      console.error("Failed to summarize meeting:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedMeeting) return;
    setIsSavingNotes(true);
    try {
      const updated = await updateMeetingTranscript(
        caseId,
        selectedMeeting._id,
        notesValue,
      );
      setHistory((items) =>
        items.map((item) => (item._id === selectedMeeting._id ? updated : item)),
      );
      setSelectedMeeting(updated);
      setIsEditingNotes(false);

      // Re-trigger summary with new notes
      setIsSummarizing(true);
      const data = await aiService.getMeetingSummary(
        caseId,
        updated._id,
        notesValue,
      );
      setSelectedSummary(data);
    } catch (error) {
      console.error("Failed to save meeting notes:", error);
    } finally {
      setIsSavingNotes(false);
      setIsSummarizing(false);
    }
  };

  const handleCreateTaskFromAction = async (
    action: MeetingActionItem | string,
    idx: number,
  ) => {
    const taskTitle = typeof action === "string" ? action : action.task;
    const priority =
      (typeof action !== "string" && action.priority) || "medium";

    try {
      await createTask(caseId, {
        title: taskTitle,
        description: `Auto-created from AI Meeting Summary for call on ${formatDate(
          selectedMeeting?.startedAt || "",
        )}`,
        priority,
      });
      setCreatedTasks((prev) => ({ ...prev, [idx]: true }));
    } catch (err) {
      console.error("Failed to convert meeting action item to task:", err);
    }
  };

  const handleCopySummary = () => {
    if (!selectedMeeting || !selectedSummary) return;
    const s = selectedSummary;
    const textToCopy = `AI Meeting Breakdown - Call on ${formatDate(
      selectedMeeting.startedAt,
    )}
Duration: ${getDurationStr(
      selectedMeeting.startedAt,
      selectedMeeting.endedAt,
    )}

EXECUTIVE SUMMARY:
${s.summary}

KEY TOPICS:
${(s.keyTopics || []).map((t) => `• ${t}`).join("\n")}

DECISIONS:
${(s.decisions || [])
  .map((d) => `• ${typeof d === "string" ? d : d.decision}`)
  .join("\n")}

ACTION ITEMS:
${(s.actionItems || [])
  .map(
    (a) =>
      `• ${typeof a === "string" ? a : a.task}${
        typeof a !== "string" && a.assignee ? ` (Assigned: ${a.assignee})` : ""
      }`,
  )
  .join("\n")}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyTranscript = () => {
    if (!selectedMeeting?.transcript) return;
    navigator.clipboard.writeText(selectedMeeting.transcript).then(() => {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    });
  };

  return (
    <aside className="flex h-full w-full flex-col bg-white border-l border-slate-200 shadow-xl md:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#5B4CF3]/10 text-[#5B4CF3] flex items-center justify-center shrink-0">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-slate-900">
              Past Meetings
            </h2>
            <p className="text-[11px] text-slate-500">
              Video call recordings, notes & AI summaries
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sub-header Controls */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-slate-700">
          {isLoading
            ? "Loading calls…"
            : `${history.length} Meeting${history.length !== 1 ? "s" : ""}`}
        </span>
        <button
          type="button"
          onClick={fetchHistory}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5B4CF3] hover:underline disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Scrollable Meeting Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 space-y-3">
            <Spinner size="md" />
            <p className="text-xs font-semibold text-slate-600">
              Loading meeting history…
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/80 text-[#5B4CF3] flex items-center justify-center shadow-2xs">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                No Past Meetings
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                No video meetings recorded for this case yet. Start a call using
                the Meet button.
              </p>
            </div>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item._id}
              onClick={() => handleOpenMeetingModal(item)}
              className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#5B4CF3]/70 hover:shadow-md hover:bg-slate-50/40 transition-all flex flex-col gap-2.5 shadow-2xs cursor-pointer group"
            >
              {/* Card Title & Duration */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5B4CF3] flex items-center justify-center shrink-0 border border-indigo-100/80 group-hover:bg-[#5B4CF3] group-hover:text-white transition-colors">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#5B4CF3] transition-colors truncate">
                    Meeting by {item.startedBy?.name || "Team Member"}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full shrink-0">
                  {getDurationStr(item.startedAt, item.endedAt)}
                </span>
              </div>

              {/* Timestamp & Attendees */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                <span className="font-medium">{formatDate(item.startedAt)}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-600">
                    {item.participants.length} attended
                  </span>
                  <div className="flex -space-x-1.5 ml-0.5">
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

              {/* Single Unified Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenMeetingModal(item);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#5B4CF3]/10 group-hover:bg-[#5B4CF3] text-[#5B4CF3] group-hover:text-white font-bold text-xs transition-all duration-200 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View Summary & Notes</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Meeting Summary & Notes Modal (Portaled to document.body) */}
      {selectedMeeting &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="meeting-breakdown-title"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#5B4CF3]/10 text-[#5B4CF3] flex items-center justify-center shrink-0 border border-[#5B4CF3]/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      id="meeting-breakdown-title"
                      className="text-base font-extrabold text-slate-900"
                    >
                      AI Meeting Breakdown
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>
                        Call from {formatDate(selectedMeeting.startedAt)}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">
                        {getDurationStr(
                          selectedMeeting.startedAt,
                          selectedMeeting.endedAt,
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    disabled={!selectedSummary}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                    title="Copy full summary to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMeeting(null);
                      setSelectedSummary(null);
                      setIsEditingNotes(false);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-4 px-6 border-b border-slate-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("summary")}
                  className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === "summary"
                      ? "border-[#5B4CF3] text-[#5B4CF3]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Breakdown & Tasks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab("transcript")}
                  className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === "transcript"
                      ? "border-[#5B4CF3] text-[#5B4CF3]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Raw Transcript & Notes</span>
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                {activeModalTab === "summary" ? (
                  isSummarizing ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3">
                      <Spinner size="md" />
                      <p className="text-xs font-semibold text-slate-600">
                        Generating AI meeting breakdown…
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Extracting key topics, decisions, and action items
                      </p>
                    </div>
                  ) : selectedSummary ? (
                    <>
                      {/* Call Metadata Overview Card */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold text-slate-400">
                              Attendees
                            </p>
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {selectedMeeting.participants.length} Members
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold text-slate-400">
                              Duration
                            </p>
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {getDurationStr(
                                selectedMeeting.startedAt,
                                selectedMeeting.endedAt,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold text-slate-400">
                              Recorded At
                            </p>
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {formatDate(selectedMeeting.startedAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Executive Summary */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 border border-indigo-100 shadow-xs space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-900">
                          <FileText className="w-4 h-4 text-[#5B4CF3]" />
                          <span>Executive Summary</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-normal">
                          {selectedSummary.summary}
                        </p>
                      </div>

                      {/* Key Topics & Discussion Points */}
                      {selectedSummary.keyTopics &&
                        selectedSummary.keyTopics.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-blue-500" />
                              <span>Key Topics Covered</span>
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedSummary.keyTopics.map((topic, i) => (
                                <span
                                  key={i}
                                  className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Discussion Points (if available) */}
                      {selectedSummary.discussionPoints &&
                        selectedSummary.discussionPoints.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <MessageSquare className="w-4 h-4 text-purple-500" />
                              <span>Discussion Points</span>
                            </h4>
                            <ul className="space-y-1.5">
                              {selectedSummary.discussionPoints.map(
                                (point, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B4CF3] mt-1.5 shrink-0" />
                                    <span className="leading-relaxed">{point}</span>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                      {/* Decisions */}
                      {selectedSummary.decisions &&
                        selectedSummary.decisions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Decisions Made</span>
                            </h4>
                            <ul className="space-y-2">
                              {selectedSummary.decisions.map((dec, i) => {
                                const text =
                                  typeof dec === "string" ? dec : dec.decision;
                                const madeBy =
                                  typeof dec !== "string" ? dec.madeBy : null;
                                const ts =
                                  typeof dec !== "string" ? dec.timestamp : null;
                                return (
                                  <li
                                    key={i}
                                    className="text-xs text-slate-800 flex items-start gap-2.5 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/70 shadow-2xs"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <span className="font-semibold text-slate-900 leading-snug block">
                                        {text}
                                      </span>
                                      {(madeBy || ts) && (
                                        <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-2">
                                          {madeBy && <span>By {madeBy}</span>}
                                          {madeBy && ts && <span>•</span>}
                                          {ts && <span>Timestamp {ts}</span>}
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
                      {selectedSummary.actionItems &&
                        selectedSummary.actionItems.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-500" />
                              <span>Action Items & Tasks</span>
                            </h4>
                            <div className="space-y-2">
                              {selectedSummary.actionItems.map((act, idx) => {
                                const taskText =
                                  typeof act === "string" ? act : act.task;
                                const assignee =
                                  typeof act !== "string" ? act.assignee : null;
                                const priority =
                                  typeof act !== "string" ? act.priority : null;
                                const isCreated = createdTasks[idx];

                                return (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 flex items-center justify-between gap-3 shadow-2xs transition-all"
                                  >
                                    <div className="text-xs text-slate-900 font-medium flex-1 min-w-0">
                                      <p className="font-bold text-slate-900 leading-snug">
                                        {taskText}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {assignee && (
                                          <span className="text-[10px] text-slate-500 font-medium">
                                            Assigned: {assignee}
                                          </span>
                                        )}
                                        {priority && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                            {priority.toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCreateTaskFromAction(act, idx)
                                      }
                                      disabled={isCreated}
                                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs ${
                                        isCreated
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-[#5B4CF3] text-white hover:bg-[#4c3ed8] active:scale-95"
                                      }`}
                                    >
                                      {isCreated ? (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Task Created</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>Add Task</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                      <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">
                        No AI Summary Available
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Add or edit notes in the Raw Transcript & Notes tab to
                        generate an AI breakdown.
                      </p>
                    </div>
                  )
                ) : (
                  /* Raw Transcript & Notes Tab with In-Modal Editing */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Speaker Notes & Transcript
                      </h4>

                      <div className="flex items-center gap-2">
                        {!isEditingNotes ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingNotes(true);
                                setNotesValue(selectedMeeting.transcript || "");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#5B4CF3] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit Notes</span>
                            </button>

                            {selectedMeeting.transcript && (
                              <button
                                type="button"
                                onClick={handleCopyTranscript}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                              >
                                {copiedTranscript ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700 font-bold">
                                      Copied!
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSaveNotes}
                              disabled={isSavingNotes}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5B4CF3] hover:bg-[#4c3ed8] text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isSavingNotes ? "Saving…" : "Save Notes"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsEditingNotes(false)}
                              disabled={isSavingNotes}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          rows={12}
                          placeholder="Paste or type meeting notes / transcript dialogue with timestamps...&#10;e.g. [00:02] Alex: We need to verify Zurich IP 185.91.22.14..."
                          className="w-full rounded-2xl border border-slate-300 p-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#5B4CF3] focus:ring-4 focus:ring-[#5B4CF3]/12 placeholder:text-slate-400 bg-white"
                        />
                        <p className="text-[11px] text-slate-500 italic">
                          Tip: Saving notes will automatically refresh the AI Breakdown with updated topics, decisions, and tasks.
                        </p>
                      </div>
                    ) : selectedMeeting.transcript ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
                        {selectedMeeting.transcript}
                      </div>
                    ) : (
                      <div className="p-10 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                        <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            No Transcript or Notes Recorded
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Add meeting notes or copy-paste a transcript to generate an AI summary.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingNotes(true);
                            setNotesValue("");
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B4CF3] text-white text-xs font-bold hover:bg-[#4c3ed8] shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Notes / Transcript</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#5B4CF3]" />
                  <span>AI Generated with Grounded Evidence</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMeeting(null);
                    setSelectedSummary(null);
                    setIsEditingNotes(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  );
};
