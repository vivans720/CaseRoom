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

export interface MeetingHistoryItem {
  _id: string;
  caseId: string;
  startedBy: { _id: string; name: string; email: string; profilePictureUrl?: string };
  startedAt: string;
  endedAt?: string;
  status: "active" | "ended";
  participants: Array<{
    user: { _id: string; name: string; email: string; profilePictureUrl?: string };
    joinedAt: string;
    leftAt?: string;
  }>;
  transcript?: string;
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

export const updateMeetingTranscript = async (caseId: string, meetingId: string, transcript: string): Promise<MeetingHistoryItem> => {
  const response = await api.put(`/cases/${caseId}/meetings/${meetingId}/transcript`, { transcript });
  return response.data.data;
};

/**
 * Fetch meeting history for a case.
 */
export const getMeetingHistory = async (
  caseId: string,
): Promise<MeetingHistoryItem[]> => {
  try {
    const response = await api.get(`/cases/${caseId}/meetings/history`);
    return response.data.data;
  } catch (error: unknown) {
    console.error("Failed to fetch meeting history:", error);
    return [];
  }
};
