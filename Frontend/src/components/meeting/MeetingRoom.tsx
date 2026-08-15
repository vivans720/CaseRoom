import { useState, type JSX } from "react";
import { useMeeting } from "../../hooks/useMeeting";
import { useAuth } from "../../hooks/useAuth";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { VideoGrid } from "./VideoGrid";
import { MeetingControls } from "./MeetingControls";
import { ParticipantListPanel } from "./ParticipantListPanel";
import { LiveCaptionsOverlay } from "./LiveCaptionsOverlay";
import "./meeting.css";

const formatDuration = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Full-screen meeting overlay rendered on top of ChatView.
 */
export const MeetingRoom = (): JSX.Element => {
  const {
    localStream,
    screenStream,
    videoAvailable,
    peers,
    mediaState,
    userRole,
    meetingError,
    pinnedUserId,
    isHandRaised,
    layoutMode,
    isLocked,
    isAudioOnly,
    durationSeconds,
    isCaptionsEnabled,
    isTranscribing,
    isSpeechRecognitionSupported,
    liveSubtitles,
    activeInterimSubtitle,
    toggleCamera,
    toggleMic,
    toggleRaiseHand,
    toggleLock,
    toggleCaptions,
    muteAll,
    removeParticipant,
    startScreenShare,
    stopScreenShare,
    setPinnedUserId,
    setLayoutMode,
    toggleAudioOnly,
    minimize,
    leaveMeeting,
    clearError,
  } = useMeeting();

  const { user } = useAuth();
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  // Keyboard Shortcuts (Ctrl+D, Ctrl+E, Space, etc.)
  useKeyboardShortcuts({
    onToggleMic: toggleMic,
    onToggleCamera: toggleCamera,
    onToggleRaiseHand: toggleRaiseHand,
    onLeave: leaveMeeting,
    enabled: true,
  });

  return (
    <div className="meeting-room">
      {/* Error banner */}
      {meetingError && (
        <div className="meeting-room__error">
          <span>{meetingError}</span>
          <button type="button" onClick={clearError} className="meeting-room__error-close">
            ✕
          </button>
        </div>
      )}

      {/* Top Header Information Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Live Duration Timer */}
        <div className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs font-mono font-bold text-white flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>{formatDuration(durationSeconds)}</span>
        </div>

        {/* Lock indicator */}
        {isLocked && (
          <div className="px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-1 shadow-lg">
            <span>🔒 Locked</span>
          </div>
        )}

        {/* Transcribing mic status badge */}
        {isCaptionsEnabled && (
          <div
            className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all ${
              isTranscribing && mediaState.audio
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-slate-900/60 border-slate-700 text-slate-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isTranscribing && mediaState.audio
                  ? "bg-indigo-400 animate-ping"
                  : "bg-slate-500"
              }`}
            />
            <span>
              {isTranscribing && mediaState.audio
                ? "Transcribing Mic"
                : "Captions ON (Mic Muted)"}
            </span>
          </div>
        )}
      </div>

      {/* Video grid */}
      <div className="meeting-room__grid-container">
        <VideoGrid
          localStream={screenStream || localStream}
          localMediaState={mediaState}
          videoAvailable={videoAvailable}
          localName={user?.name || "You"}
          localProfilePicture={user?.profilePictureUrl}
          peers={peers}
          pinnedUserId={pinnedUserId}
          onTogglePin={setPinnedUserId}
          currentUserId={user?._id ?? ""}
        />
      </div>

      {/* Floating Live Subtitles Banner — only shown when user enables captions */}
      {isCaptionsEnabled && (
        <LiveCaptionsOverlay
          liveSubtitles={liveSubtitles}
          activeInterimSubtitle={activeInterimSubtitle}
        />
      )}

      {/* Slide-over Participant List Panel */}
      <ParticipantListPanel
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        localName={user?.name || "You"}
        localProfilePicture={user?.profilePictureUrl}
        localMediaState={mediaState}
        localRole={userRole}
        peers={peers}
        pinnedUserId={pinnedUserId}
        onTogglePin={setPinnedUserId}
        currentUserId={user?._id ?? ""}
        isLocked={isLocked}
        onToggleLock={toggleLock}
        onMuteAll={muteAll}
        onRemoveParticipant={removeParticipant}
      />

      {/* Controls */}
      <MeetingControls
        mediaState={mediaState}
        videoAvailable={videoAvailable}
        userRole={userRole}
        isHandRaised={isHandRaised}
        isParticipantsOpen={isParticipantsOpen}
        layoutMode={layoutMode}
        isAudioOnly={isAudioOnly}
        isCaptionsEnabled={isCaptionsEnabled}
        isTranscribing={isTranscribing}
        isSpeechRecognitionSupported={isSpeechRecognitionSupported}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleRaiseHand={toggleRaiseHand}
        onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
        onToggleLayoutMode={() =>
          setLayoutMode(layoutMode === "grid" ? "speaker" : "grid")
        }
        onToggleAudioOnly={toggleAudioOnly}
        onToggleCaptions={toggleCaptions}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onMinimize={minimize}
        onLeave={leaveMeeting}
      />

      {/* Participant count button */}
      <button
        type="button"
        onClick={() => setIsParticipantsOpen((prev) => !prev)}
        className="meeting-room__participant-count cursor-pointer hover:bg-white/20 transition-colors"
      >
        👥 {peers.size + 1} participant{peers.size + 1 !== 1 ? "s" : ""}
      </button>
    </div>
  );
};
