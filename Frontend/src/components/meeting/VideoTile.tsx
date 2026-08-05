import { useEffect, useRef, useState, type JSX } from "react";
import type { PeerMediaState } from "../../types";

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  profilePictureUrl?: string | null;
  mediaState: PeerMediaState;
  isLocal?: boolean;
  isVideoAvailable?: boolean;
  isSpeaking?: boolean;
  isHandRaised?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

const MicOffIcon = (): JSX.Element => (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .88-.16 1.72-.46 2.49" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const CameraOffIcon = (): JSX.Element => (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
  </svg>
);

const ScreenShareIcon = (): JSX.Element => (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

/**
 * Generate a consistent color from a name string.
 */
const getAvatarColor = (name: string): string => {
  const colors = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
    "#3b82f6", "#6366f1",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const VideoTile = ({
  stream,
  name,
  profilePictureUrl,
  mediaState,
  isLocal = false,
  isVideoAvailable = true,
  isSpeaking = false,
  isHandRaised = false,
  isPinned = false,
  onTogglePin,
}: VideoTileProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioSpeaking, setIsAudioSpeaking] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, mediaState.video, mediaState.screenShare]);

  // Real-time audio volume detection for green active speaker border
  useEffect(() => {
    if (!stream || !mediaState.audio) {
      setIsAudioSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      setIsAudioSpeaking(false);
      return;
    }

    let animId: number;
    let audioCtx: AudioContext | null = null;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setIsAudioSpeaking(avg > 10);
        animId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("AudioContext speaker detection error:", err);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [stream, mediaState.audio]);

  const showVideo = Boolean(
    stream && (mediaState.screenShare || (mediaState.video && isVideoAvailable)),
  );
  const handRaised = isHandRaised || mediaState.isHandRaised;
  const speaking = isSpeaking || mediaState.isSpeaking || isAudioSpeaking;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`meeting-tile relative ${
        speaking ? "meeting-tile--speaking ring-4 ring-emerald-500 shadow-xl shadow-emerald-500/30" : ""
      } ${isPinned ? "ring-2 ring-primary" : ""}`}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`meeting-tile__video ${!showVideo ? "meeting-tile__video--hidden" : ""}`}
      />

      {/* Avatar fallback when camera off */}
      {!showVideo && (
        <div className="meeting-tile__avatar">
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt={name}
              className="meeting-tile__avatar-img"
            />
          ) : (
            <div
              className="meeting-tile__avatar-initials"
              style={{ backgroundColor: getAvatarColor(name) }}
            >
              {initials}
            </div>
          )}
        </div>
      )}

      {/* Hand Raised badge */}
      {handRaised && (
        <div className="absolute top-3 left-3 bg-amber-500 text-white p-1 px-2 rounded-full text-xs font-bold shadow-md animate-bounce flex items-center gap-1 z-10">
          <span>✋ Hand Raised</span>
        </div>
      )}

      {/* Active Speaker badge */}
      {speaking && !handRaised && (
        <div className="absolute top-3 left-3 bg-emerald-500 text-white p-1 px-2.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1 z-10 animate-pulse">
          <span>🔊 Speaking</span>
        </div>
      )}

      {/* Pin button */}
      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          title={isPinned ? "Unpin tile" : "Pin tile"}
          className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition-all z-10 ${
            isPinned
              ? "bg-primary text-white shadow-md"
              : "bg-black/40 text-white/70 hover:text-white opacity-0 group-hover:opacity-100"
          }`}
        >
          📌
        </button>
      )}

      {/* Bottom overlay */}
      <div className="meeting-tile__overlay">
        <div className="meeting-tile__name">
          {isLocal ? "You" : name}
          {mediaState.screenShare && (
            <span className="meeting-tile__badge meeting-tile__badge--screen">
              <ScreenShareIcon />
              Screen
            </span>
          )}
        </div>
        <div className="meeting-tile__indicators">
          {!mediaState.audio && (
            <span className="meeting-tile__indicator meeting-tile__indicator--muted">
              <MicOffIcon />
            </span>
          )}
          {!mediaState.video && (
            <span className="meeting-tile__indicator meeting-tile__indicator--cam-off">
              <CameraOffIcon />
            </span>
          )}
        </div>
      </div>

      {/* Local badge */}
      {isLocal && <div className="meeting-tile__local-badge">You</div>}

      {/* Camera unavailable indicator */}
      {isLocal && !isVideoAvailable && (
        <div className="meeting-tile__no-camera">Camera unavailable</div>
      )}
    </div>
  );
};
