import api from "./api";
import type { Annotation, ApiResponse } from "../types";

export interface CreateAnnotationPayload {
  messageId?: string | null;
  fileUrl: string;
  pageNumber?: number;
  type: Annotation["type"];
  coordinates: Annotation["coordinates"];
  style: Annotation["style"];
  text?: string;
}

export interface UpdateAnnotationPayload {
  coordinates?: Annotation["coordinates"];
  style?: Partial<Annotation["style"]>;
  text?: string;
  pageNumber?: number;
}

export const annotationService = {
  getAnnotations: async (
    caseId: string,
    fileUrl?: string,
    messageId?: string
  ): Promise<Annotation[]> => {
    const params: Record<string, string> = {};
    if (fileUrl) params.fileUrl = fileUrl;
    if (messageId) params.messageId = messageId;

    const response = await api.get<ApiResponse<Annotation[]>>(
      `/cases/${caseId}/annotations`,
      { params }
    );
    return response.data.data;
  },

  createAnnotation: async (
    caseId: string,
    payload: CreateAnnotationPayload
  ): Promise<Annotation> => {
    const response = await api.post<ApiResponse<Annotation>>(
      `/cases/${caseId}/annotations`,
      payload
    );
    return response.data.data;
  },

  updateAnnotation: async (
    caseId: string,
    annotationId: string,
    payload: UpdateAnnotationPayload
  ): Promise<Annotation> => {
    const response = await api.put<ApiResponse<Annotation>>(
      `/cases/${caseId}/annotations/${annotationId}`,
      payload
    );
    return response.data.data;
  },

  deleteAnnotation: async (
    caseId: string,
    annotationId: string
  ): Promise<void> => {
    await api.delete(`/cases/${caseId}/annotations/${annotationId}`);
  },
};
