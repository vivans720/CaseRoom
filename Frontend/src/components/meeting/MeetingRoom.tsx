import { useState, type JSX } from "react";
import { useMeeting } from "../../hooks/useMeeting";
import { useAuth } from "../../hooks/useAuth";
import { VideoGrid } from "./VideoGrid";
import { MeetingControls } from "./MeetingControls";
import { ParticipantListPanel } from "./ParticipantListPanel";
import "./meeting.css";

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
    toggleCamera,
    toggleMic,
    toggleRaiseHand,
    startScreenShare,
    stopScreenShare,
    setPinnedUserId,
    minimize,
    leaveMeeting,
    clearError,
  } = useMeeting();

  const { user } = useAuth();
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

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
      />

      {/* Controls */}
      <MeetingControls
        mediaState={mediaState}
        videoAvailable={videoAvailable}
        userRole={userRole}
        isHandRaised={isHandRaised}
        isParticipantsOpen={isParticipantsOpen}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleRaiseHand={toggleRaiseHand}
        onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
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
