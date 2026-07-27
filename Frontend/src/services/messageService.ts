import { type AxiosProgressEvent } from "axios";
import api from "./api";
import type { Message, MessagePage, Case, User } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

interface GetMessagesResponse {
  success: boolean;
  data: MessagePage;
}

interface GetCaseResponse {
  success: boolean;
  data: Case;
}

interface GetParticipantsResponse {
  success: boolean;
  data: User[];
}

/**
 * Fetch a paginated list of messages for a case.
 * Returns the full MessagePage (total, page, totalPages, messages).
 */
export const getMessages = async (
  caseId: string,
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT,
): Promise<MessagePage> => {
  const response = await api.get<GetMessagesResponse>(
    `/cases/${caseId}/messages`,
    { params: { page, limit } },
  );
  return response.data.data;
};

/**
 * Fetch a single case by ID.
 */
export const getCaseById = async (id: string): Promise<Case> => {
  const response = await api.get<GetCaseResponse>(`/cases/${id}`);
  return response.data.data;
};

/**
 * Fetch the participant list for a case.
 */
export const getCaseParticipants = async (id: string): Promise<User[]> => {
  const response = await api.get<GetParticipantsResponse>(
    `/cases/${id}/participants`,
  );
  return response.data.data;
};

/**
 * Upload a file message for a case.
 */
export const uploadFileMessage = async (
  caseId: string,
  file: File,
  caption?: string,
  replyToId?: string,
  mentionedUserIds?: string[],
  onProgress?: (progressEvent: AxiosProgressEvent) => void,
) => {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) {
    formData.append("content", caption);
  }
  if (replyToId) {
    formData.append("replyToId", replyToId);
  }
  if (mentionedUserIds && mentionedUserIds.length > 0) {
    formData.append("mentionedUserIds", JSON.stringify(mentionedUserIds));
  }

  const response = await api.post(
    `/cases/${caseId}/messages/upload`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    },
  );
  return response.data;
};

export const searchMessages = async (
  caseId: string,
  query: string,
): Promise<Message[]> => {
  const response = await api.get<{
    success: boolean;
    data: {
      messages: Message[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalMessages: number;
        limit: number;
      };
    };
  }>(`/cases/${caseId}/messages/search`, { params: { q: query } });
  return response.data.data.messages;
};

export const editMessage = async (
  caseId: string,
  messageId: string,
  content: string,
): Promise<Message> => {
  const response = await api.patch<{ success: boolean; data: Message }>(
    `/cases/${caseId}/messages/${messageId}`,
    { content },
  );
  return response.data.data;
};

export const getMessagePage = async (
  caseId: string,
  messageId: string,
  limit: number = 50,
): Promise<number> => {
  const response = await api.get<{ success: boolean; data: { page: number } }>(
    `/cases/${caseId}/messages/page/${messageId}`,
    { params: { limit } },
  );
  return response.data.data.page;
};

export const getCaseVaultItems = async (
  caseId: string,
  category: string = "all",
  search?: string,
  page: number = 1,
  limit: number = 50,
) => {
  const response = await api.get<{
    success: boolean;
    data: import("../types").VaultResponse;
  }>(`/cases/${caseId}/vault`, {
    params: { category, search, page, limit },
  });
  return response.data.data;
};

export const pinMessage = async (caseId: string, messageId: string): Promise<Message> => {
  const response = await api.post<{ success: boolean; data: Message }>(`/cases/${caseId}/messages/${messageId}/pin`);
  return response.data.data;
};

export const unpinMessage = async (caseId: string, messageId: string): Promise<void> => {
  await api.delete(`/cases/${caseId}/messages/${messageId}/pin`);
};

export const getPinnedMessages = async (caseId: string): Promise<Message[]> => {
  const response = await api.get<{ success: boolean; data: Message[] }>(`/cases/${caseId}/messages/pinned`);
  return response.data.data;
};

