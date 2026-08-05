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
  onToggleSidebar?: () => void;
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
  onToggleSidebar,
}: ChatHeaderProps): JSX.Element => {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<CaseRole | null>(null);
  const onCaseLoadedRef = useRef(onCaseLoaded);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    onCaseLoadedRef.current = onCaseLoaded;
  }, [onCaseLoaded]);

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
      className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-3 md:px-6 flex items-center gap-2 md:gap-4 shrink-0"
    >
      {/* Mobile Menu & Back buttons */}
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
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Case title & horizontal tags */}
      <div className="flex items-center gap-2.5 flex-wrap min-w-0 flex-1">
        <h2
          className="text-base font-extrabold tracking-tight text-slate-900 truncate leading-tight shrink-0"
          title={caseData.title}
        >
          {caseData.title}
        </h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusPill status={caseData.status} />
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#5B4CF3] border border-purple-200/60">
            {priority} Priority
          </span>
          {category && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200/70">
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Presence & Participants Pill */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/70"
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
            flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl transition-all duration-200 border
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

        {/* Meeting Button */}
        <JoinMeetingButton caseId={caseId} userRole={userRole} />
      </div>

      {/* Grouped Top Toolbar Icons */}
      <div className="flex items-center gap-2 shrink-0 pl-1 border-l border-slate-100">
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
    </header>
  );
};
