import { useState, useEffect, useCallback, useRef, type JSX } from "react";
import type { User, CaseRole, Case } from "../../types";
import {
  getCaseById,
  getCaseParticipants,
  updateParticipants,
  type ParticipantWithRole,
} from "../../services/caseService";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import { AddParticipantModal } from "./AddParticipantModal";

interface ParticipantsPanelProps {
  caseId: string;
  onShowContactPreview?: (user: User) => void;
  onClose?: () => void;
}

const resolveId = (value: string | User | undefined): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id;
};

const formatLastSeen = (lastSeen: string | null): string => {
  if (!lastSeen) return "Offline";
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Last seen ${diffDays}d ago`;
};

// ─── Participant Card Row ───────────────────────────────────────────────────

interface ParticipantRowProps {
  participant: ParticipantWithRole;
  isOnline: boolean;
  lastSeen: string | null;
  isCreator: boolean;
  canManage: boolean;
  isSelf: boolean;
  onRemove: (userId: string) => void;
  onRoleChange: (userId: string, newRole: CaseRole) => void;
  isRemoving: boolean;
  onShowContactPreview?: (user: User) => void;
}

const ParticipantRow = ({
  participant,
  isOnline,
  lastSeen,
  isCreator,
  canManage,
  isSelf,
  onRemove,
  onRoleChange,
  isRemoving,
  onShowContactPreview,
}: ParticipantRowProps): JSX.Element => {
  const role = participant.role || (isCreator ? "Admin" : "Editor");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const getRoleBadge = (r: CaseRole) => {
    switch (r) {
      case "Admin":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-[#5B4CF3] border border-purple-200/60 shrink-0">
            Admin
          </span>
        );
      case "Observer":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
            Observer
          </span>
        );
      case "Editor":
      default:
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60 shrink-0">
            Editor
          </span>
        );
    }
  };

  return (
    <li className="relative flex items-center justify-between p-3.5 my-2 mx-1 rounded-2xl border border-slate-100 bg-white/90 shadow-2xs hover:border-purple-200/80 hover:shadow-xs transition-all duration-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar
          name={participant.name}
          size="md"
          isOnline={isOnline}
          src={participant.profilePictureUrl}
          onClick={onShowContactPreview ? () => onShowContactPreview(participant) : undefined}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-900 truncate">
              {participant.name}
            </span>
            {isSelf && (
              <span className="text-[10px] font-medium text-slate-400 shrink-0">(You)</span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-semibold text-slate-500 truncate">
              {participant.employeeId}
            </span>
            {getRoleBadge(role)}
            {isCreator && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-600 border border-amber-200/60 shrink-0">
                Creator
              </span>
            )}
          </div>

          {isOnline ? (
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 font-medium truncate mt-1">
              {formatLastSeen(lastSeen)}
            </p>
          )}
        </div>
      </div>

      {/* Item 2 & 3: Pill Role Selector or 3-Dot Action Menu */}
      <div className="flex items-center gap-1 shrink-0 ml-1" ref={menuRef}>
        {canManage && !isCreator && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              disabled={isRemoving}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
              title="Manage participant"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {/* 3-Dot Context Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Role
                </div>
                
                {(["Admin", "Editor", "Observer"] as CaseRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onRoleChange(participant._id, r);
                      setIsMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      role === r ? "bg-purple-50 text-[#5B4CF3]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{r}</span>
                    {role === r && <span className="text-[#5B4CF3]">✓</span>}
                  </button>
                ))}

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    onRemove(participant._id);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v2m3 4s0 0 0 0" />
                  </svg>
                  Remove User
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

// ─── Panel ────────────────────────────────────────────────────────────────────

export const ParticipantsPanel = ({
  caseId,
  onShowContactPreview,
  onClose,
}: ParticipantsPanelProps): JSX.Element => {
  const { user: currentUser } = useAuth();
  const { onlineUserIds, lastSeenUpdates } = usePresence(caseId);

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithRole[]>([]);
  const [creatorId, setCreatorId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [fetchedCase, fetchedParticipants] = await Promise.all([
        getCaseById(caseId),
        getCaseParticipants(caseId),
      ]);
      setCaseData(fetchedCase);
      setCreatorId(resolveId(fetchedCase.creatorId));
      setParticipants(fetchedParticipants);
    } catch {
      setError("Failed to load participants. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemove = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      await updateParticipants(caseId, "remove", userId);
      await fetchData();
    } catch {
      setError("Failed to remove participant. Please try again.");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: CaseRole) => {
    try {
      await updateParticipants(caseId, "updateRole", userId, newRole);
      await fetchData();
    } catch {
      setError("Failed to update participant role. Please try again.");
    }
  };

  const currentUserId = currentUser?._id ?? "";
  const isCreatorOfCase = creatorId === currentUserId;
  const currentUserRole = participants.find((p) => p._id === currentUserId)?.role || (isCreatorOfCase ? "Admin" : "Editor");
  const canManageParticipants = isCreatorOfCase || currentUserRole === "Admin";

  const existingParticipantIds = participants.map(
    (participant) => participant._id,
  );

  return (
    <aside
      id="participants-panel"
      className="absolute inset-y-0 right-0 z-40 w-full md:relative md:w-[300px] bg-white/90 backdrop-blur-xl border-l border-slate-200/80 h-full flex flex-col shrink-0 overflow-hidden shadow-xl md:shadow-none"
      aria-label="Participants panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none"
              aria-label="Close participants list"
              title="Close list"
            >
              ✕
            </button>
          )}
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
            Participants
            {!isLoading && participants.length > 0 && (
              <span className="ml-1.5 text-xs font-semibold text-[#5B4CF3]">
                ({participants.length})
              </span>
            )}
          </h3>
        </div>

        {canManageParticipants && !isLoading && (
          <button
            id="add-participant-btn"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Add participant"
            title="Add participant"
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5B4CF3] to-[#8B2EFF] text-white shadow-xs hover:scale-105 active:scale-95 transition-all duration-200"
          >
            + Add
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="px-4 py-6">
            <p className="text-xs text-red-500 text-center font-medium" role="alert">
              {error}
            </p>
            <button
              onClick={fetchData}
              className="mt-3 block mx-auto text-xs font-bold text-[#5B4CF3] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : participants.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              title="No participants"
              description="This case has no participants yet."
            />
          </div>
        ) : (
          <div>
            <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              TEAM MEMBERS
            </p>
            <ul role="list" aria-label="Participant list">
              {participants.map((participant) => (
                <ParticipantRow
                  key={participant._id}
                  participant={participant}
                  isOnline={onlineUserIds.has(participant._id)}
                  lastSeen={
                    lastSeenUpdates[participant._id] || participant.lastSeen
                  }
                  isCreator={participant._id === creatorId}
                  canManage={canManageParticipants}
                  isSelf={participant._id === currentUserId}
                  onRemove={handleRemove}
                  onRoleChange={handleRoleChange}
                  isRemoving={removingUserId === participant._id}
                  onShowContactPreview={onShowContactPreview}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Item 4: Case Overview & Metadata Details */}
        {caseData && !isLoading && (
          <div className="pt-2 border-t border-slate-100 px-2 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              CASE METADATA
            </p>
            
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Priority</span>
                <span className="font-bold text-slate-900">{caseData.priority || "Medium"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Category</span>
                <span className="font-bold text-slate-900">{caseData.category || "Incident"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="font-bold text-emerald-600">{caseData.status}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-400">Created</span>
                <span className="text-slate-600 font-medium">
                  {new Date(caseData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      <AddParticipantModal
        caseId={caseId}
        existingParticipantIds={existingParticipantIds}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={fetchData}
      />
    </aside>
  );
};
