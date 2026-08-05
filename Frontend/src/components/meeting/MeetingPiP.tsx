import { useState, useRef, useEffect, useCallback, type JSX } from "react";
import { useMeeting } from "../../hooks/useMeeting";
import { useAuth } from "../../hooks/useAuth";
import { VideoTile } from "./VideoTile";
import "./meeting.css";

/**
 * Floating picture-in-picture meeting window.
 * Draggable, shows local + most recent peer, compact controls.
 */
export const MeetingPiP = (): JSX.Element => {
  const {
    localStream,
    videoAvailable,
    peers,
    mediaState,
    toggleMic,
    toggleCamera,
    expand,
    leaveMeeting,
  } = useMeeting();

  const { user } = useAuth();

  // Dragging
  const pipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Default position: bottom-right
  useEffect(() => {
    if (position.x === -1 && position.y === -1) {
      setPosition({
        x: window.innerWidth - 300,
        y: window.innerHeight - 280,
      });
    }
  }, [position]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!pipRef.current) return;
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.current.y)),
      });
    };

    const onMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  // Get first peer for thumbnail
  const firstPeer = peers.size > 0 ? Array.from(peers.values())[0] : null;

  return (
    <div
      ref={pipRef}
      className="meeting-pip"
      style={{ left: position.x, top: position.y }}
    >
      {/* Drag handle / header */}
      <div
        className="meeting-pip__header"
        onMouseDown={onMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <span className="meeting-pip__status">
          <span className="meeting-pip__dot" />
          In Meeting ({peers.size + 1})
        </span>
        <button
          type="button"
          onClick={expand}
          className="meeting-pip__expand"
          title="Expand"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>

      {/* Video thumbnails */}
      <div className="meeting-pip__videos">
        <div className="meeting-pip__tile">
          <VideoTile
            stream={localStream}
            name={user?.name || "You"}
            profilePictureUrl={user?.profilePictureUrl}
            mediaState={mediaState}
            isLocal
            isVideoAvailable={videoAvailable}
          />
        </div>
        {firstPeer && (
          <div className="meeting-pip__tile">
            <VideoTile
              stream={firstPeer.stream}
              name={firstPeer.name}
              profilePictureUrl={firstPeer.profilePictureUrl}
              mediaState={firstPeer.mediaState}
            />
          </div>
        )}
      </div>

      {/* Compact controls */}
      <div className="meeting-pip__controls">
        <button
          type="button"
          onClick={toggleMic}
          className={`meeting-pip__btn ${
            mediaState.audio ? "meeting-pip__btn--on" : "meeting-pip__btn--off"
          }`}
          title={mediaState.audio ? "Mute" : "Unmute"}
        >
          {mediaState.audio ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          disabled={!videoAvailable}
          className={`meeting-pip__btn ${
            !videoAvailable
              ? "meeting-pip__btn--disabled"
              : mediaState.video
                ? "meeting-pip__btn--on"
                : "meeting-pip__btn--off"
          }`}
          title={mediaState.video ? "Camera off" : "Camera on"}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>

        <button
          type="button"
          onClick={leaveMeeting}
          className="meeting-pip__btn meeting-pip__btn--leave"
          title="Leave meeting"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </div>
    </div>
  );
};
