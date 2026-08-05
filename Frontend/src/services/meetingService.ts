import api from "./api";

export interface ActiveMeetingResponse {
  meetingId: string;
  caseId: string;
  startedBy: string;
  startedAt: string;
  activeParticipants: number;
  participants: Array<{
    user: string | { _id: string; name: string; profilePictureUrl?: string };
    joinedAt: string;
  }>;
}

/**
 * Check if an active meeting exists for a case.
 * Returns meeting data or null if no active meeting.
 */
export const getActiveMeeting = async (
  caseId: string,
): Promise<ActiveMeetingResponse | null> => {
  try {
    const response = await api.get(`/cases/${caseId}/meeting/active`);
    return response.data.data;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
