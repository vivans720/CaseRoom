import type { JSX } from "react";
import { useMeeting } from "../../hooks/useMeeting";
import { useAuth } from "../../hooks/useAuth";
import { VideoGrid } from "./VideoGrid";
import { MeetingControls } from "./MeetingControls";
import "./meeting.css";

/**
 * Full-screen meeting overlay rendered on top of ChatView.
 */
export const MeetingRoom = (): JSX.Element => {
  const {
    localStream,
    videoAvailable,
    peers,
    mediaState,
    userRole,
    meetingError,
    toggleCamera,
    toggleMic,
    startScreenShare,
    stopScreenShare,
    minimize,
    leaveMeeting,
    clearError,
  } = useMeeting();

  const { user } = useAuth();

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
          localStream={localStream}
          localMediaState={mediaState}
          videoAvailable={videoAvailable}
          localName={user?.name || "You"}
          localProfilePicture={user?.profilePictureUrl}
          peers={peers}
        />
      </div>

      {/* Controls */}
      <MeetingControls
        mediaState={mediaState}
        videoAvailable={videoAvailable}
        userRole={userRole}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onMinimize={minimize}
        onLeave={leaveMeeting}
      />

      {/* Participant count */}
      <div className="meeting-room__participant-count">
        {peers.size + 1} participant{peers.size + 1 !== 1 ? "s" : ""}
      </div>
    </div>
  );
};
