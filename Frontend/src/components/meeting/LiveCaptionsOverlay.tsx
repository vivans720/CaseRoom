import React, { useEffect, useState } from "react";
import type { LiveSubtitle } from "../../contexts/MeetingContext";

interface CaptionPillProps {
  sub: LiveSubtitle;
  isInterim?: boolean;
}

/**
 * Individual subtitle pill with graceful multi-stage fade out transition.
 */
const CaptionPill: React.FC<CaptionPillProps> = ({ sub, isInterim = false }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (isInterim) {
      setIsFading(false);
      return;
    }

    // Begin fast & smooth fade out at 1.8s after sentence finishes
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1800);

    return () => clearTimeout(fadeTimer);
  }, [isInterim, sub.text, sub.timestamp]);

  return (
    <div
      className={`max-w-2xl px-4 py-2 rounded-2xl text-center shadow-2xl backdrop-blur-xl transition-all duration-700 ease-out will-change-transform ${
        isInterim
          ? "bg-slate-950/90 border border-indigo-500/40 ring-1 ring-indigo-500/30 text-indigo-100 shadow-indigo-950/40"
          : "bg-slate-950/85 border border-white/12 text-slate-100 shadow-black/60"
      } ${
        isFading
          ? "opacity-0 -translate-y-2 scale-98 blur-[1px]"
          : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      <span
        className={`text-xs font-semibold mr-2 tracking-wide uppercase ${
          isInterim ? "text-indigo-300" : "text-indigo-400"
        }`}
      >
        {sub.senderName}:
      </span>
      <span
        className={`text-sm md:text-[15px] leading-relaxed tracking-wide ${
          isInterim ? "italic text-indigo-100 font-normal" : "text-white font-normal"
        }`}
      >
        {sub.text}
        {isInterim && (
          <span className="inline-block w-1.5 h-3 ml-1.5 bg-indigo-400 rounded-full animate-pulse align-middle" />
        )}
      </span>
    </div>
  );
};

interface LiveCaptionsOverlayProps {
  liveSubtitles: LiveSubtitle[];
  activeInterimSubtitle: LiveSubtitle | null;
}

/**
 * Isolated, high-performance Live Captions Overlay with smooth CSS fade transitions.
 */
export const LiveCaptionsOverlay: React.FC<LiveCaptionsOverlayProps> = React.memo(
  ({ liveSubtitles, activeInterimSubtitle }) => {
    const hasCommitted = liveSubtitles.length > 0;
    const hasInterim = Boolean(activeInterimSubtitle && activeInterimSubtitle.text.trim());

    if (!hasCommitted && !hasInterim) {
      return null;
    }

    // Keep up to 2 most recent finalized lines
    const recentCommitted = liveSubtitles.slice(-2);

    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-full px-4 flex flex-col items-center gap-2 pointer-events-none transition-all">
        {/* Finalized sentences with slow 1000ms fade away */}
        {recentCommitted.map((sub, idx) => (
          <CaptionPill
            key={`${sub.userId}-${sub.timestamp}-${idx}`}
            sub={sub}
            isInterim={false}
          />
        ))}

        {/* Real-time streaming interim speech */}
        {hasInterim && activeInterimSubtitle && (
          <CaptionPill
            key={`interim-${activeInterimSubtitle.userId}`}
            sub={activeInterimSubtitle}
            isInterim={true}
          />
        )}
      </div>
    );
  },
);

LiveCaptionsOverlay.displayName = "LiveCaptionsOverlay";
