import { useState, useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Clock,
  CheckSquare,
  Folder,
  Search,
  Files,
  AlertTriangle,
  Settings,
  Users,
  Video,
  MoreHorizontal,
  ChevronLeft,
} from "lucide-react";
import type { Case, User, CaseStatus, CaseRole } from "../../types";
import { getCaseById, getCaseParticipants } from "../../services/caseService";
import { Spinner } from "../ui/Spinner";
import { NotificationBell } from "../notifications/NotificationBell";
import type { RightPanel } from "../../hooks/useDashboardPanel";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import { JoinMeetingButton } from "../meeting/JoinMeetingButton";
import { TimelineViewModal } from "./TimelineViewModal";

interface ChatHeaderProps {
  caseId: string;
  activePanel: RightPanel;
  onTogglePanel: (panel: RightPanel) => void;
  onlineUserIds: Set<string>;
  onCaseLoaded?: (caseData: Case) => void;
  onJumpToMessage?: (messageId: string) => void;
}

const getStatusStyle = (status: Case["status"]) => {
  switch (status) {
    case "Open":
      return { dot: "bg-rose-500", label: "Open" };
    case "In Progress":
      return { dot: "bg-amber-500", label: "In Progress" };
    case "Under Review":
      return { dot: "bg-indigo-500", label: "Under Review" };
    case "Resolved":
      return { dot: "bg-emerald-500", label: "Resolved" };
    case "Closed":
    case "archived":
      return { dot: "bg-slate-400", label: "Closed" };
    case "active":
    default:
      return { dot: "bg-emerald-500", label: "Active" };
  }
};

const getCategoryStyle = (category?: string) => {
  switch (category) {
    case "Incident":
      return { dot: "bg-rose-500" };
    case "Legal":
      return { dot: "bg-amber-500" };
    case "HR":
      return { dot: "bg-emerald-500" };
    case "Engineering":
      return { dot: "bg-blue-500" };
    default:
      return { dot: "bg-[#5B4CF3]" };
  }
};

export const ChatHeader = ({
  caseId,
  activePanel,
  onTogglePanel,
  onlineUserIds,
  onCaseLoaded,
  onJumpToMessage,
}: ChatHeaderProps): JSX.Element => {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<CaseRole | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const onCaseLoadedRef = useRef(onCaseLoaded);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  useEffect(() => {
    onCaseLoadedRef.current = onCaseLoaded;
  }, [onCaseLoaded]);

  // Close more-menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreMenuOpen]);

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedCase, fetchedParticipants] = await Promise.all([
          getCaseById(caseId),
          getCaseParticipants(caseId),
        ]);
        if (!cancelled) {
          setCaseData(fetchedCase);
          setParticipants(fetchedParticipants);
          onCaseLoadedRef.current?.(fetchedCase);
          if (user) {
            const me = fetchedParticipants.find(
              (p: User) => p._id === user._id,
            );
            setUserRole((me as unknown as { role?: CaseRole })?.role || null);
          }
        }
      } catch {
        // Case may not exist
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    const handleRefresh = () => {
      void fetchData();
    };

    window.addEventListener("caseroom:refresh_cases", handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("caseroom:refresh_cases", handleRefresh);
    };
  }, [caseId]);

  useEffect(() => {
    if (!socket || !isConnected || !caseId) return;

    const handleStatusUpdated = (event: {
      caseId: string;
      status: CaseStatus;
    }) => {
      if (event.caseId === caseId) {
        setCaseData((prev) =>
          prev ? { ...prev, status: event.status } : prev,
        );
      }
    };

    socket.on("case:status_updated", handleStatusUpdated);
    return () => {
      socket.off("case:status_updated", handleStatusUpdated);
    };
  }, [socket, isConnected, caseId]);

  if (isLoading) {
    return (
      <header className="h-16 bg-white border-b border-slate-100 px-4 md:px-6 flex items-center">
        <Spinner size="sm" />
      </header>
    );
  }

  if (!caseData) {
    return (
      <header className="h-16 bg-white border-b border-slate-100 px-4 md:px-6 flex items-center">
        <span className="text-xs text-slate-500 font-medium">
          Case not found
        </span>
      </header>
    );
  }

  const priority = caseData.priority || "Medium";
  const category = caseData.category;
  const statusStyle = getStatusStyle(caseData.status);
  const categoryStyle = getCategoryStyle(category);

  return (
    <header
      id="chat-header"
      className="relative z-30 h-[72px] bg-white border-b border-slate-100 px-3 md:px-6 flex items-center justify-between gap-3 shrink-0"
    >
      {/* ─── Left Section: Case Identity Anchor (Title & Metadata) ─── */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {/* Mobile Back Button */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none md:hidden shrink-0 cursor-pointer"
          aria-label="Back to cases"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          {/* Case Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${categoryStyle.dot}`}
              title={`Category: ${category || "General"}`}
            />
            <h1
              className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate tracking-tight"
              title={caseData.title}
            >
              {caseData.title}
            </h1>
          </div>

          {/* Compact Metadata Subtitle Row */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 min-w-0 flex-wrap">
            {category && (
              <>
                <span className="font-bold text-slate-700">{category}</span>
                <span className="text-slate-300">•</span>
              </>
            )}

            {/* Status indicator */}
            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              <span>{statusStyle.label}</span>
            </span>

            <span className="text-slate-300">•</span>

            {/* Priority */}
            <span className="font-medium text-slate-500 whitespace-nowrap">
              {priority} Priority
            </span>

            <span className="text-slate-300 hidden sm:inline">•</span>

            {/* Participant & Presence pill */}
            <button
              type="button"
              id="participants-count-btn"
              onClick={() => onTogglePanel("participants")}
              aria-label="View participants list"
              title={`${participants.length} total members, ${onlineUserIds.size} online`}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer text-slate-600 font-semibold ${
                activePanel === "participants"
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : ""
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{participants.length} members</span>
              <span className="text-slate-300">·</span>
              <span className="text-emerald-600 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                {onlineUserIds.size} online
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Right Section: Intentional Action Hierarchy ─── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
        {/* Secondary Action: Video Meet */}
        <div className="shrink-0">
          <JoinMeetingButton caseId={caseId} userRole={userRole} />
        </div>

        {/* Primary Action: Ask AI */}
        <button
          type="button"
          id="toggle-assistant-btn"
          onClick={() => onTogglePanel("assistant")}
          className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer ${
            activePanel === "assistant"
              ? "bg-[#4939da] text-white ring-2 ring-[#5B4CF3]/30"
              : "bg-[#5B4CF3] hover:bg-[#4d3ee0] text-white"
          }`}
          title="Ask AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        {/* Investigation Tool: Timeline */}
        <button
          type="button"
          id="toggle-timeline-btn"
          onClick={() => setIsTimelineModalOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
          title="Investigation Timeline"
        >
          <Clock className="w-3.5 h-3.5 text-[#5B4CF3] shrink-0" />
          <span className="hidden md:inline">Timeline</span>
        </button>

        {/* Frequently Used: Search Messages */}
        <button
          type="button"
          id="toggle-search-btn"
          aria-label="Search messages"
          title="Search messages"
          onClick={() => onTogglePanel("search")}
          className={`w-8.5 h-8.5 flex items-center justify-center rounded-xl border border-slate-200/90 text-slate-600 transition-all cursor-pointer shadow-2xs ${
            activePanel === "search"
              ? "bg-indigo-50 border-indigo-200 text-[#5B4CF3] font-bold"
              : "bg-white hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications Bell */}
        <div className="flex items-center shrink-0">
          <NotificationBell />
        </div>

        {/* Organized "More" (⋯) Dropdown Menu */}
        <div className="relative shrink-0" ref={moreMenuRef}>
          <button
            type="button"
            id="header-more-menu-btn"
            onClick={() => setMoreMenuOpen((prev) => !prev)}
            className={`w-8.5 h-8.5 flex items-center justify-center rounded-xl border border-slate-200/90 text-slate-600 transition-all cursor-pointer shadow-2xs ${
              moreMenuOpen
                ? "bg-slate-100 text-slate-900"
                : "bg-white hover:bg-slate-50 hover:text-slate-900"
            }`}
            aria-label="More options"
            title="More options & tools"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {moreMenuOpen && (
            <div className="absolute right-0 top-full z-[100] mt-2 w-56 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-2.5 p-1 text-slate-800">
                {/* AI & Investigation Tools */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                    AI & Investigation
                  </p>
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      id="toggle-similar-btn"
                      onClick={() => {
                        onTogglePanel("similar");
                        setMoreMenuOpen(false);
                      }}
                      aria-label="Similar Cases"
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activePanel === "similar"
                          ? "bg-purple-50 text-[#5B4CF3]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Files className="w-4 h-4 text-[#5B4CF3]" />
                      <span>Similar Cases</span>
                    </button>

                    <button
                      type="button"
                      id="toggle-insights-btn"
                      onClick={() => {
                        onTogglePanel("insights");
                        setMoreMenuOpen(false);
                      }}
                      aria-label="AI Insights"
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activePanel === "insights"
                          ? "bg-purple-50 text-[#5B4CF3]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>AI Insights</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTimelineModalOpen(true);
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer sm:hidden"
                    >
                      <Clock className="w-4 h-4 text-[#5B4CF3]" />
                      <span>Investigation Timeline</span>
                    </button>

                  </div>
                </div>

                {/* Case Tools */}
                <div className="border-t border-slate-100 pt-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                    Case Tools
                  </p>
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      id="toggle-tasks-btn"
                      onClick={() => {
                        onTogglePanel("tasks");
                        setMoreMenuOpen(false);
                      }}
                      aria-label="Tasks"
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activePanel === "tasks"
                          ? "bg-purple-50 text-[#5B4CF3]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                      <span>Tasks</span>
                    </button>

                    <button
                      type="button"
                      id="toggle-media-btn"
                      onClick={() => {
                        onTogglePanel("media");
                        setMoreMenuOpen(false);
                      }}
                      aria-label="Files & Media"
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activePanel === "media"
                          ? "bg-purple-50 text-[#5B4CF3]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Folder className="w-4 h-4 text-blue-500" />
                      <span>Files & Media</span>
                    </button>

                    <button
                      type="button"
                      id="toggle-meetings-btn"
                      onClick={() => {
                        onTogglePanel("meetings");
                        setMoreMenuOpen(false);
                      }}
                      aria-label="Meeting History"
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activePanel === "meetings"
                          ? "bg-purple-50 text-[#5B4CF3]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Video className="w-4 h-4 text-indigo-500" />
                      <span>Meeting History</span>
                    </button>
                  </div>
                </div>

                {/* Administration */}
                <div className="border-t border-slate-100 pt-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                    Administration
                  </p>
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onTogglePanel("participants");
                        setMoreMenuOpen(false);
                      }}
                      aria-label="Manage Participants"
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activePanel === "participants"
                          ? "bg-purple-50 text-[#5B4CF3]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>Participants ({participants.length})</span>
                    </button>

                    <button
                      type="button"
                      id="toggle-settings-btn"
                      onClick={() => {
                        onTogglePanel("settings");
                        setMoreMenuOpen(false);
                      }}
                      aria-label="Case settings"
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activePanel === "settings"
                          ? "bg-purple-50 text-[#5B4CF3]"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Case Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TimelineViewModal
        caseId={caseId}
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        onJumpToMessage={onJumpToMessage}
      />
    </header>
  );
};
