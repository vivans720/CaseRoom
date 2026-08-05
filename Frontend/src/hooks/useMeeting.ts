import { useMeetingContext } from "../contexts/MeetingContext";

/**
 * Hook to access meeting state and actions.
 * Must be used within a MeetingProvider.
 */
export const useMeeting = () => useMeetingContext();
