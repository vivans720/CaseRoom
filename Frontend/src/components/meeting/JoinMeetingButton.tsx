import { useState, useEffect, useCallback, type JSX } from "react";
import { useMeeting } from "../../hooks/useMeeting";
import { useSocketContext } from "../../contexts/SocketContext";
import { getActiveMeeting } from "../../services/meetingService";
import type { CaseRole } from "../../types";
import "./meeting.css";

interface JoinMeetingButtonProps {
  caseId: string;
  userRole?: CaseRole | null;
}

const VideoIcon = (): JSX.Element => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

export const JoinMeetingButton = ({
  caseId,
  userRole,
}: JoinMeetingButtonProps): JSX.Element => {
  const { joinMeeting, isInMeeting, meetingCaseId } = useMeeting();
  const { socket } = useSocketContext();
  const [activeParticipants, setActiveParticipants] = useState<number>(0);
  const [hasActiveMeeting, setHasActiveMeeting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isObserver = userRole === "Observer";
  const isInThisMeeting = isInMeeting && meetingCaseId === caseId;

  // Check for active meeting on mount
  const checkActiveMeeting = useCallback(async () => {
    try {
      const meeting = await getActiveMeeting(caseId);
      if (meeting) {
        setHasActiveMeeting(true);
        setActiveParticipants(meeting.activeParticipants);
      } else {
        setHasActiveMeeting(false);
        setActiveParticipants(0);
      }
    } catch {
      // Silently fail — button will show "Start Meeting"
    }
  }, [caseId]);

  useEffect(() => {
    checkActiveMeeting();
  }, [checkActiveMeeting]);

  // Listen for meeting events to update button state
  useEffect(() => {
    if (!socket) return;

    const onUserJoined = () => {
      setHasActiveMeeting(true);
      setActiveParticipants((prev) => prev + 1);
    };

    const onUserLeft = () => {
      setActiveParticipants((prev) => Math.max(0, prev - 1));
    };

    const onMeetingEnded = (data: { caseId: string }) => {
      if (data.caseId === caseId) {
        setHasActiveMeeting(false);
        setActiveParticipants(0);
      }
    };

    socket.on("meeting:user-joined", onUserJoined);
    socket.on("meeting:user-left", onUserLeft);
    socket.on("meeting:ended", onMeetingEnded);

    return () => {
      socket.off("meeting:user-joined", onUserJoined);
      socket.off("meeting:user-left", onUserLeft);
      socket.off("meeting:ended", onMeetingEnded);
    };
  }, [socket, caseId]);

  const handleClick = async () => {
    if (isInThisMeeting) return;
    setIsLoading(true);
    try {
      await joinMeeting(caseId);
    } finally {
      setIsLoading(false);
    }
  };

  // If already in this meeting, show indicator
  if (isInThisMeeting) {
    return (
      <div className="join-meeting-btn join-meeting-btn--active">
        <span className="join-meeting-btn__dot join-meeting-btn__dot--pulse" />
        <span>In Meeting</span>
      </div>
    );
  }

  // If in a different meeting
  if (isInMeeting && meetingCaseId !== caseId) {
    return (
      <button
        type="button"
        disabled
        className="join-meeting-btn join-meeting-btn--disabled"
        title="Leave current meeting first"
      >
        <VideoIcon />
        <span>In Another Meeting</span>
      </button>
    );
  }

  // Observer can't start, but can join
  const canStart = !isObserver;
  const disabled = !hasActiveMeeting && !canStart;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`join-meeting-btn ${
        hasActiveMeeting
          ? "join-meeting-btn--join"
          : disabled
            ? "join-meeting-btn--disabled"
            : "join-meeting-btn--start"
      }`}
      title={
        disabled
          ? "Only Admin or Editor can start a meeting"
          : hasActiveMeeting
            ? `Join meeting (${activeParticipants} in call)`
            : "Start a new meeting"
      }
    >
      <VideoIcon />
      <span>
        {isLoading
          ? "Joining..."
          : hasActiveMeeting
            ? `Join (${activeParticipants})`
            : "Meet"}
      </span>
      {hasActiveMeeting && (
        <span className="join-meeting-btn__dot join-meeting-btn__dot--pulse" />
      )}
    </button>
  );
};
