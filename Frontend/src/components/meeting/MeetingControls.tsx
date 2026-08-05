import type { JSX } from "react";
import type { PeerMediaState, CaseRole } from "../../types";

interface MeetingControlsProps {
  mediaState: PeerMediaState;
  videoAvailable: boolean;
  userRole: CaseRole | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onMinimize: () => void;
  onLeave: () => void;
}

const MicIcon = (): JSX.Element => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = (): JSX.Element => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .88-.16 1.72-.46 2.49" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const CameraIcon = (): JSX.Element => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const CameraOffIcon = (): JSX.Element => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
  </svg>
);

const ScreenShareIcon = (): JSX.Element => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const MinimizeIcon = (): JSX.Element => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const LeaveIcon = (): JSX.Element => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const MeetingControls = ({
  mediaState,
  videoAvailable,
  userRole,
  onToggleMic,
  onToggleCamera,
  onStartScreenShare,
  onStopScreenShare,
  onMinimize,
  onLeave,
}: MeetingControlsProps): JSX.Element => {
  const isObserver = userRole === "Observer";

  return (
    <div className="meeting-controls">
      {/* Mic Toggle */}
      <button
        type="button"
        onClick={onToggleMic}
        className={`meeting-controls__btn ${
          mediaState.audio
            ? "meeting-controls__btn--on"
            : "meeting-controls__btn--off"
        }`}
        title={mediaState.audio ? "Mute microphone" : "Unmute microphone"}
      >
        {mediaState.audio ? <MicIcon /> : <MicOffIcon />}
      </button>

      {/* Camera Toggle */}
      <button
        type="button"
        onClick={onToggleCamera}
        disabled={!videoAvailable}
        className={`meeting-controls__btn ${
          !videoAvailable
            ? "meeting-controls__btn--disabled"
            : mediaState.video
              ? "meeting-controls__btn--on"
              : "meeting-controls__btn--off"
        }`}
        title={
          !videoAvailable
            ? "Camera unavailable"
            : mediaState.video
              ? "Turn off camera"
              : "Turn on camera"
        }
      >
        {mediaState.video && videoAvailable ? <CameraIcon /> : <CameraOffIcon />}
      </button>

      {/* Screen Share — hidden for Observers */}
      {!isObserver && (
        <button
          type="button"
          onClick={
            mediaState.screenShare ? onStopScreenShare : onStartScreenShare
          }
          className={`meeting-controls__btn ${
            mediaState.screenShare
              ? "meeting-controls__btn--screen-active"
              : "meeting-controls__btn--on"
          }`}
          title={
            mediaState.screenShare ? "Stop sharing" : "Share your screen"
          }
        >
          <ScreenShareIcon />
        </button>
      )}

      {/* Minimize */}
      <button
        type="button"
        onClick={onMinimize}
        className="meeting-controls__btn meeting-controls__btn--on"
        title="Minimize to picture-in-picture"
      >
        <MinimizeIcon />
      </button>

      {/* Leave */}
      <button
        type="button"
        onClick={onLeave}
        className="meeting-controls__btn meeting-controls__btn--leave"
        title="Leave meeting"
      >
        <LeaveIcon />
      </button>
    </div>
  );
};
