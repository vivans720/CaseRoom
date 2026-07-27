import api from "./api";
import type { ApiResponse, CreateTaskDto, Task, UpdateTaskDto } from "../types";

export const getCaseTasks = async (caseId: string): Promise<ApiResponse<Task[]>> => {
  const response = await api.get<ApiResponse<Task[]>>(`/cases/${caseId}/tasks`);
  return response.data;
};

export const createTask = async (
  caseId: string,
  taskData: CreateTaskDto
): Promise<ApiResponse<Task>> => {
  const response = await api.post<ApiResponse<Task>>(
    `/cases/${caseId}/tasks`,
    taskData
  );
  return response.data;
};

export const updateTask = async (
  caseId: string,
  taskId: string,
  taskData: UpdateTaskDto
): Promise<ApiResponse<Task>> => {
  const response = await api.patch<ApiResponse<Task>>(
    `/cases/${caseId}/tasks/${taskId}`,
    taskData
  );
  return response.data;
};

export const deleteTask = async (
  caseId: string,
  taskId: string
): Promise<ApiResponse<{ message: string; taskId: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string; taskId: string }>>(
    `/cases/${caseId}/tasks/${taskId}`
  );
  return response.data;
};
