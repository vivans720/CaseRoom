import { useState, type JSX } from "react";
import { Outlet, useParams } from "react-router-dom";
import { CaseSidebar } from "../components/cases/CaseSidebar";
import { EmptyState } from "../components/ui/EmptyState";
import { ParticipantsPanel } from "../components/participants/ParticipantsPanel";
import { NotificationToast } from "../components/notifications/NotificationToast";
import { CaseSettingsPanel } from "../components/cases/CaseSettingsPanel";
import { MessageSearchBar } from "../components/chat/MessageSearchBar";
import { MediaVaultPanel } from "../components/chat/MediaVaultPanel";
import { ContactPreviewModal } from "../components/profile/ContactPreviewModal";
import { TaskPanel } from "../components/tasks/TaskPanel";
import { AIAssistantPanel } from "../components/chat/AIAssistantPanel";
import { SimilarCasesPanel } from "../components/cases/SimilarCasesPanel";
import { AIInsightPanel } from "../components/chat/AIInsightPanel";
import { usePresence } from "../hooks/usePresence";
import type { User } from "../types";
import type {
  RightPanel,
  DashboardOutletContext,
} from "../hooks/useDashboardPanel";

// ─── Empty state ─────────────────────────────────────────────────────────────

interface NoCaseSelectedProps {
  onOpenCreateCase?: () => void;
  onOpenKnowledge?: () => void;
}

const NoCaseSelected = ({ onOpenCreateCase, onOpenKnowledge }: NoCaseSelectedProps): JSX.Element => (
  <div className="relative flex h-full flex-1 items-center justify-center bg-[#f6f5fa] overflow-hidden p-6">
    {/* Background Aurora & Ambient Glows */}
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute -top-[15%] -left-[10%] h-[550px] w-[550px] rounded-full bg-purple-200/50 blur-[150px] animate-pulse" 
        style={{ animationDuration: '10s' }} 
      />
      <div 
        className="absolute -bottom-[15%] -right-[10%] h-[550px] w-[550px] rounded-full bg-indigo-200/50 blur-[150px] animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '2s' }} 
      />
    </div>

    <div className="relative z-10 w-full max-w-lg">
      <EmptyState
        title="Select a case to get started"
        description="Choose an active IT case from the sidebar or create a new case to start collaborating with your team."
        action={onOpenCreateCase ? { label: "New Case", onClick: onOpenCreateCase } : undefined}
        secondaryAction={{
          label: "Filter Sidebar",
          onClick: () => {
            const input = document.querySelector('input[type="search"]') as HTMLInputElement
            input?.focus()
          }
        }}
      />
      <button type="button" onClick={onOpenKnowledge} className="mx-auto mt-4 block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Ask organization knowledge</button>
    </div>
  </div>
);

// ─── Right panel resolver ─────────────────────────────────────────────────────

const renderRightPanel = (
  panel: RightPanel,
  caseId: string,
  onToggle: (panel: RightPanel) => void,
  onJump: (id: string) => void,
  onShowContactPreview: (user: User) => void,
): JSX.Element | null => {
  if (!panel) return null;

  if (panel === "participants") {
    return (
      <ParticipantsPanel
        caseId={caseId}
        onShowContactPreview={onShowContactPreview}
        onClose={() => onToggle("participants")}
      />
    );
  }

  if (panel === "settings") {
    return (
      <CaseSettingsPanel
        caseId={caseId}
        onClose={() => onToggle("settings")}
      />
    );
  }

  if (panel === "search") {
    return (
      <MessageSearchBar
        caseId={caseId}
        onClose={() => onToggle("search")}
        onResultClick={onJump}
      />
    );
  }

  if (panel === "media") {
    return (
      <MediaVaultPanel
        caseId={caseId}
        onClose={() => onToggle("media")}
        onJumpToMessage={onJump}
      />
    );
  }

  if (panel === "tasks") {
    return (
      <TaskPanel
        caseId={caseId}
        onClose={() => onToggle("tasks")}
      />
    );
  }

  if (panel === "assistant") {
    return <AIAssistantPanel caseId={caseId} onClose={() => onToggle("assistant")} onJumpToMessage={onJump} />;
  }

  if (panel === "similar") {
    return <SimilarCasesPanel caseId={caseId} onClose={() => onToggle("similar")} />;
  }

  if (panel === "insights") {
    return <AIInsightPanel caseId={caseId} onClose={() => onToggle("insights")} />;
  }

  const _exhaustive: never = panel;
  throw new Error(`Unhandled right panel: ${String(_exhaustive)}`);
};

// ─── Dashboard Page ────────────────────────────────────────────────────────────

export const DashboardPage = (): JSX.Element => {
  const { caseId } = useParams();
  const hasCaseSelected = Boolean(caseId);

  const [activePanel, setActivePanel] = useState<RightPanel>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [showKnowledge, setShowKnowledge] = useState(false);

  const { onlineUserIds, lastSeenUpdates } = usePresence(caseId);

  const togglePanel = (panel: RightPanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const handleJumpRequest = (id: string) => {
    setJumpToMessageId(id);
  };

  const outletContext: DashboardOutletContext = {
    activePanel,
    togglePanel,
    jumpToMessageId,
    setJumpToMessageId,
    onShowContactPreview: setPreviewUser,
    isSidebarOpen,
    setSidebarOpen,
  };

  return (
    <div className="relative flex h-dvh overflow-hidden bg-[#f6f5fa]">
      {/* Left: Case sidebar (Item 2: w-[400px] / lg:w-[420px]) */}
      <div
        className={`${
          hasCaseSelected ? "hidden md:flex" : "flex w-full md:w-[400px] lg:w-[420px]"
        } md:flex md:w-[400px] lg:w-[420px] shrink-0 border-r border-slate-200/80 h-full bg-white/90 backdrop-blur-xl shadow-xs`}
      >
        <CaseSidebar />
      </div>

      {/* Center: Chat view (Outlet) or empty state */}
      <main
        className={`${
          hasCaseSelected ? "flex w-full bg-white" : "hidden md:flex md:flex-1"
        } min-h-0 min-w-0 flex-1 flex-col h-full`}
      >
        <h1 className="sr-only">Dashboard</h1>
        {hasCaseSelected ? (
          <Outlet context={outletContext} />
        ) : (
          <NoCaseSelected 
            onOpenCreateCase={() => {
              const btn = document.getElementById("new-case-button")
              btn?.click()
            }}
            onOpenKnowledge={() => setShowKnowledge(true)}
          />
        )}
      </main>

      {/* Mobile Drawer Sidebar Overlay */}
      {hasCaseSelected && isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[340px] h-full bg-white shadow-2xl md:hidden animate-in slide-in-from-left duration-200">
            <CaseSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Mobile backdrop for right panels */}
      {hasCaseSelected &&
        activePanel && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
              onClick={() => togglePanel(null)}
            />
            <div className="absolute inset-y-0 right-0 z-40 w-full md:relative md:w-[300px] md:max-w-[300px] animate-in slide-in-from-right duration-200">
              {renderRightPanel(
                activePanel,
                caseId!,
                togglePanel,
                handleJumpRequest,
                setPreviewUser,
              )}
            </div>
          </>
        )}

      <NotificationToast />

      {showKnowledge && (
        <div className="fixed inset-y-0 right-0 z-50 w-full border-l border-slate-200 shadow-2xl md:w-[380px]">
          <AIAssistantPanel onClose={() => setShowKnowledge(false)} />
        </div>
      )}

      <ContactPreviewModal
        isOpen={!!previewUser}
        user={previewUser}
        isOnline={previewUser ? onlineUserIds.has(previewUser._id) : false}
        lastSeenTime={
          previewUser
            ? lastSeenUpdates[previewUser._id] || previewUser.lastSeen
            : null
        }
        onClose={() => setPreviewUser(null)}
      />
    </div>
  );
};
