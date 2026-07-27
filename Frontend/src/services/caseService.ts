import api from "./api";
import type { Case, User, CasePriority, CaseCategory, CaseStatus, CaseRole } from "../types";

export interface ParticipantWithRole extends User {
  role?: CaseRole;
}

interface CreateCasePayload {
  title: string;
  description?: string;
  priority?: CasePriority;
  category?: CaseCategory;
}

interface CreateCaseResponse {
  success: boolean;
  message: string;
  data: Case;
}

interface GetCasesResponse {
  success: boolean;
  data: Case[];
}

interface UnreadCountResponse {
  success: boolean;
  data: { unreadCount: number };
}

interface GetCaseResponse {
  success: boolean;
  data: Case;
}

interface GetParticipantsResponse {
  success: boolean;
  data: User[];
}

export const createCase = async (
  title: string,
  description?: string,
  priority?: CasePriority,
  category?: CaseCategory,
): Promise<Case> => {
  const payload: CreateCasePayload = { title };
  if (description?.trim()) {
    payload.description = description.trim();
  }
  if (priority) {
    payload.priority = priority;
  }
  if (category) {
    payload.category = category;
  }
  const response = await api.post<CreateCaseResponse>("/cases", payload);
  return response.data.data;
};

export const getUserCases = async (): Promise<Case[]> => {
  const response = await api.get<GetCasesResponse>("/cases");
  return response.data.data;
};

export const pinCase = async (caseId: string): Promise<void> => {
  await api.put(`/cases/${caseId}/pin`);
};

export const unpinCase = async (caseId: string): Promise<void> => {
  await api.delete(`/cases/${caseId}/pin`);
};

export const getUnreadCount = async (caseId: string): Promise<number> => {
  const response = await api.get<UnreadCountResponse>(
    `/cases/${caseId}/unread-count`,
  );
  return response.data.data.unreadCount;
};

export const getCaseById = async (id: string): Promise<Case> => {
  const response = await api.get<GetCaseResponse>(`/cases/${id}`);
  return response.data.data;
};

export const getCaseParticipants = async (id: string): Promise<ParticipantWithRole[]> => {
  const response = await api.get<GetParticipantsResponse>(
    `/cases/${id}/participants`,
  );
  return response.data.data;
};

export const archiveCase = async (caseId: string): Promise<void> => {
  await api.put(`/cases/${caseId}/archive`);
};

export const unarchiveCase = async (caseId: string): Promise<void> => {
  await api.put(`/cases/${caseId}/unarchive`);
};

export const updateCaseStatus = async (
  caseId: string,
  status: CaseStatus,
): Promise<Case> => {
  const response = await api.put<GetCaseResponse>(`/cases/${caseId}/status`, {
    status,
  });
  return response.data.data;
};

export const deleteCase = async (caseId: string): Promise<void> => {
  await api.delete(`/cases/${caseId}`);
};

export const updateParticipants = async (
  caseId: string,
  action: "add" | "remove" | "updateRole",
  userId: string,
  role?: CaseRole,
): Promise<void> => {
  await api.put(`/cases/${caseId}/participants`, { action, userId, role });
};

export const searchCases = async (params: {
  q?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  category?: CaseCategory;
  sortBy?: "newest" | "oldest" | "recently_active";
  dateFrom?: string;
  dateTo?: string;
}): Promise<Case[]> => {
  const response = await api.get<GetCasesResponse>("/cases/search", {
    params,
  });
  return response.data.data;
};

export const fetchAllCases = async (): Promise<Case[]> => {
  const response = await api.get<GetCasesResponse>("/cases/all");
  return response.data.data;
};

export const exportCasePdf = async (caseId: string, title: string): Promise<void> => {
  const response = await api.get(`/cases/${caseId}/export-pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  link.download = `case_${safeTitle}_export.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
