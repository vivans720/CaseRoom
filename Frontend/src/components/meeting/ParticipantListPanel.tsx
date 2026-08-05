import type { JSX } from "react";
import type { MeetingPeer, PeerMediaState, CaseRole } from "../../types";
import { Avatar } from "../ui/Avatar";

interface ParticipantListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  localName: string;
  localProfilePicture?: string | null;
  localMediaState: PeerMediaState;
  localRole: CaseRole | null;
  peers: Map<string, MeetingPeer>;
  pinnedUserId: string | null;
  onTogglePin: (userId: string | null) => void;
  currentUserId: string;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onMuteAll?: () => void;
  onRemoveParticipant?: (userId: string) => void;
}

export const ParticipantListPanel = ({
  isOpen,
  onClose,
  localName,
  localProfilePicture,
  localMediaState,
  localRole,
  peers,
  pinnedUserId,
  onTogglePin,
  currentUserId,
  isLocked = false,
  onToggleLock,
  onMuteAll,
  onRemoveParticipant,
}: ParticipantListPanelProps): JSX.Element | null => {
  if (!isOpen) return null;

  const peerArray = Array.from(peers.values());
  const total = peerArray.length + 1;
  const isHost = localRole === "Admin" || localRole === "Editor";

  return (
    <div className="absolute right-4 top-16 bottom-24 w-80 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden text-white animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">Participants</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-primary/20 text-primary">
            {total}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors text-lg"
        >
          ✕
        </button>
      </div>

      {/* Host Controls Action Bar */}
      {isHost && (
        <div className="p-2.5 border-b border-white/10 bg-white/5 flex items-center justify-between gap-2 text-xs">
          {onMuteAll && (
            <button
              type="button"
              onClick={onMuteAll}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all font-semibold flex-1 text-center"
            >
              🔇 Mute All
            </button>
          )}

          {onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              className={`px-2.5 py-1.5 rounded-lg border font-semibold flex-1 text-center transition-all ${
                isLocked
                  ? "bg-amber-500 text-white border-amber-400"
                  : "bg-white/10 text-white border-white/10 hover:bg-white/20"
              }`}
            >
              {isLocked ? "🔒 Locked" : "🔓 Lock Meeting"}
            </button>
          )}
        </div>
      )}

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Local user row */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={localName} src={localProfilePicture} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate">
                {localName} <span className="text-white/50 font-normal">(You)</span>
              </span>
              {localRole && (
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">
                  {localRole}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {localMediaState.isHandRaised && (
              <span className="text-base" title="Hand raised">
                ✋
              </span>
            )}
            <span
              className={`text-xs p-1 rounded-full ${
                localMediaState.audio ? "text-emerald-400" : "text-rose-400 bg-rose-500/20"
              }`}
            >
              {localMediaState.audio ? "🎙️" : "🔇"}
            </span>
            <button
              type="button"
              onClick={() => onTogglePin(pinnedUserId === currentUserId ? null : currentUserId)}
              title={pinnedUserId === currentUserId ? "Unpin tile" : "Pin tile"}
              className={`text-xs p-1 rounded-full transition-colors ${
                pinnedUserId === currentUserId ? "bg-primary text-white" : "text-white/40 hover:text-white"
              }`}
            >
              📌
            </button>
          </div>
        </div>

        {/* Remote peers rows */}
        {peerArray.map((peer) => (
          <div
            key={peer.userId}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={peer.name} src={peer.profilePictureUrl} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">{peer.name}</span>
                {peer.mediaState.screenShare && (
                  <span className="text-[10px] font-semibold text-emerald-400">
                    Sharing screen
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {(peer.isHandRaised || peer.mediaState.isHandRaised) && (
                <span className="text-base" title="Hand raised">
                  ✋
                </span>
              )}
              <span
                className={`text-xs p-1 rounded-full ${
                  peer.mediaState.audio ? "text-emerald-400" : "text-rose-400 bg-rose-500/20"
                }`}
              >
                {peer.mediaState.audio ? "🎙️" : "🔇"}
              </span>
              <button
                type="button"
                onClick={() => onTogglePin(pinnedUserId === peer.userId ? null : peer.userId)}
                title={pinnedUserId === peer.userId ? "Unpin tile" : "Pin tile"}
                className={`text-xs p-1 rounded-full transition-colors ${
                  pinnedUserId === peer.userId ? "bg-primary text-white" : "text-white/40 hover:text-white"
                }`}
              >
                📌
              </button>

              {/* Kick button for hosts */}
              {isHost && onRemoveParticipant && (
                <button
                  type="button"
                  onClick={() => onRemoveParticipant(peer.userId)}
                  title="Remove participant"
                  className="text-xs p-1 rounded-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  🚫
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
