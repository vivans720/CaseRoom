import { useState, useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import type { Case, User, CaseStatus } from "../../types";
import { getCaseById, getCaseParticipants } from "../../services/caseService";
import { Spinner } from "../ui/Spinner";
import { NotificationBell } from "../notifications/NotificationBell";
import type { RightPanel } from "../../hooks/useDashboardPanel";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import { JoinMeetingButton } from "../meeting/JoinMeetingButton";
import type { CaseRole } from "../../types";

interface ChatHeaderProps {
  caseId: string;
  activePanel: RightPanel;
  onTogglePanel: (panel: RightPanel) => void;
  onlineUserIds: Set<string>;
  onCaseLoaded?: (caseData: Case) => void;
}

const getStatusStyle = (status: Case["status"]) => {
  switch (status) {
    case "Open":
      return { badge: "bg-red-50 text-red-600 border border-red-200/60 font-bold", dot: "bg-red-500", label: "Open" }
    case "In Progress":
      return { badge: "bg-amber-50 text-amber-600 border border-amber-200/60 font-semibold", dot: "bg-amber-500", label: "In Progress" }
    case "Under Review":
      return { badge: "bg-purple-50 text-[#5B4CF3] border border-purple-200/60 font-semibold", dot: "bg-purple-500", label: "Under Review" }
    case "Resolved":
      return { badge: "bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-bold", dot: "bg-emerald-500", label: "Resolved" }
    case "Closed":
      return { badge: "bg-slate-100 text-slate-600 border border-slate-200/60 font-medium", dot: "bg-slate-400", label: "Closed" }
    case "archived":
      return { badge: "bg-slate-100 text-slate-600 border border-slate-200/60 font-medium", dot: "bg-slate-400", label: "Archived" }
    case "active":
    default:
      return { badge: "bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-bold", dot: "bg-emerald-500", label: "Active" }
  }
}

const StatusPill = ({ status }: { status: Case["status"] }): JSX.Element => {
  const style = getStatusStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${style.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
};

interface PanelButtonProps {
  id: string;
  label: string;
  icon: string;
  panel: RightPanel;
  activePanel: RightPanel;
  onToggle: (panel: RightPanel) => void;
}

const PanelButton = ({
  id,
  label,
  icon,
  panel,
  activePanel,
  onToggle,
}: PanelButtonProps): JSX.Element => {
  const isActive = activePanel === panel;
  return (
    <button
      id={id}
      aria-label={label}
      title={label}
      onClick={() => onToggle(panel)}
      className={`
        w-8.5 h-8.5 flex items-center justify-center rounded-xl text-sm
        transition-all duration-200 hover:scale-105 active:scale-95
        ${
          isActive
            ? "bg-[#5B4CF3] text-white shadow-xs font-bold"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }
      `}
    >
      {icon}
    </button>
  );
};

export const ChatHeader = ({
  caseId,
  activePanel,
  onTogglePanel,
  onlineUserIds,
  onCaseLoaded,
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

  useEffect(() => {
    onCaseLoadedRef.current = onCaseLoaded;
  }, [onCaseLoaded]);

  // Close mobile more-menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
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
          // Determine user role
          if (user) {
            const me = fetchedParticipants.find((p: User) => p._id === user._id);
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

    const handleStatusUpdated = (event: { caseId: string; status: CaseStatus }) => {
      if (event.caseId === caseId) {
        setCaseData((prev) => (prev ? { ...prev, status: event.status } : prev));
      }
    };

    socket.on("case:status_updated", handleStatusUpdated);
    return () => {
      socket.off("case:status_updated", handleStatusUpdated);
    };
  }, [socket, isConnected, caseId]);

  if (isLoading) {
    return (
      <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 flex items-center">
        <Spinner size="sm" />
      </header>
    );
  }

  if (!caseData) {
    return (
      <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 flex items-center">
        <span className="text-xs text-slate-500 font-medium">Case not found</span>
      </header>
    );
  }

  const priority = caseData.priority || "Medium";
  const category = caseData.category;

  return (
    <header
      id="chat-header"
      className="relative z-30 h-16 bg-white border-b border-slate-100 px-3 md:px-6 flex items-center gap-2 md:gap-4 shrink-0"
    >
      {/* Mobile Back button */}
      <div className="flex items-center gap-1 md:hidden shrink-0">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
          aria-label="Back to cases"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Case title & horizontal tags */}
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <h2
          className="text-sm md:text-base font-extrabold tracking-tight text-slate-900 truncate leading-tight shrink"
          title={caseData.title}
        >
          {caseData.title}
        </h2>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusPill status={caseData.status} />
          <span className="hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#5B4CF3] border border-purple-200/60">
            {priority} Priority
          </span>
          {category && (
            <span className="hidden md:inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200/70">
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Desktop: Presence & Participants Pill */}
      <div className="hidden md:flex items-center gap-2.5 shrink-0">
        <div
          className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/70"
          title={`${onlineUserIds.size} online`}
        >
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
            aria-hidden="true"
          />
          <span className="font-bold text-slate-900">{onlineUserIds.size}</span>
          <span>online</span>
        </div>

        <button
          id="participants-count-btn"
          onClick={() => onTogglePanel("participants")}
          className={`
            flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl transition-all duration-200 border
            ${
              activePanel === "participants"
                ? "bg-purple-50 text-[#5B4CF3] border-purple-200/80 font-semibold"
                : "border-slate-200/70 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
          `}
          title={`${participants.length} participant${participants.length !== 1 ? "s" : ""}`}
          aria-label="View participants list"
        >
          <span className="text-sm" aria-hidden="true">
            👥
          </span>
          <span className="font-bold">{participants.length}</span>
        </button>
      </div>

      {/* Always visible: Meeting Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        <JoinMeetingButton caseId={caseId} userRole={userRole} />
      </div>

      {/* Desktop: Grouped Top Toolbar Icons */}
      <div className="hidden md:flex items-center gap-2 shrink-0 pl-1 border-l border-slate-100">
        <NotificationBell />

        {/* Grouped Tools Pill Container */}
        <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/70">
          <PanelButton
            id="toggle-tasks-btn"
            label="Action Items / Tasks"
            icon="☑️"
            panel="tasks"
            activePanel={activePanel}
            onToggle={onTogglePanel}
          />
          <PanelButton
            id="toggle-media-btn"
            label="Files & Media"
            icon="📁"
            panel="media"
            activePanel={activePanel}
            onToggle={onTogglePanel}
          />
          <PanelButton
            id="toggle-search-btn"
            label="Search messages"
            icon="🔍"
            panel="search"
            activePanel={activePanel}
            onToggle={onTogglePanel}
          />
        </div>

        {/* Settings Group */}
        <PanelButton
          id="toggle-settings-btn"
          label="Case settings"
          icon="⚙️"
          panel="settings"
          activePanel={activePanel}
          onToggle={onTogglePanel}
        />
      </div>

      {/* Mobile: More options dropdown */}
      <div className="relative md:hidden shrink-0" ref={moreMenuRef}>
        <button
          type="button"
          onClick={() => setMoreMenuOpen((prev) => !prev)}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
          aria-label="More options"
          title="More options"
        >
          ⋮
        </button>

        {moreMenuOpen && (
          <div
            className="absolute right-0 top-full z-[100] mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex flex-col gap-1 text-slate-800">
              {/* Header with status */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Case Actions
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {onlineUserIds.size} online
                </span>
              </div>

              {/* Action items list */}
              <button
                type="button"
                onClick={() => {
                  onTogglePanel("participants");
                  setMoreMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activePanel === "participants"
                    ? "bg-purple-50 text-[#5B4CF3]"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-base">👥</span>
                <span>Participants ({participants.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTogglePanel("tasks");
                  setMoreMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activePanel === "tasks"
                    ? "bg-purple-50 text-[#5B4CF3]"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-base">☑️</span>
                <span>Action Items / Tasks</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTogglePanel("media");
                  setMoreMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activePanel === "media"
                    ? "bg-purple-50 text-[#5B4CF3]"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-base">📁</span>
                <span>Files & Media</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTogglePanel("search");
                  setMoreMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activePanel === "search"
                    ? "bg-purple-50 text-[#5B4CF3]"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-base">🔍</span>
                <span>Search Messages</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTogglePanel("settings");
                  setMoreMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activePanel === "settings"
                    ? "bg-purple-50 text-[#5B4CF3]"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-base">⚙️</span>
                <span>Case Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
