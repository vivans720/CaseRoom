export type CaseStatus =
  | "Open"
  | "In Progress"
  | "Under Review"
  | "Resolved"
  | "Closed"
  | "active"
  | "archived";
export type CasePriority = "Low" | "Medium" | "High" | "Critical";
export type CaseCategory = "Incident" | "Legal" | "HR" | "Engineering";
export type CaseRole = "Admin" | "Editor" | "Observer";

export interface CaseParticipant {
  user: string | User;
  role: CaseRole;
}

export type MessageType = "text" | "image" | "video" | "audio" | "document";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export type NotificationType =
  | "new_message"
  | "mentioned_in_message"
  | "added_to_case"
  | "removed_from_case"
  | "case_archived"
  | "case_unarchived"
  | "case_status_updated"
  | "case_deleted"
  | "role_updated"
  | "task_assigned"
  | "task_completed"
  | "task_status_updated";

export interface Task {
  _id: string;
  caseId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: User[];
  createdBy: User;
  completedBy?: User | null;
  completedAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignees?: string[];
  dueDate?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignees?: string[];
  dueDate?: string | null;
}

export interface User {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  profilePictureUrl?: string | null;
  lastSeen: string | null;
  pinnedCases: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  _id: string;
  title: string;
  description?: string;
  creatorId: string | User;
  status: CaseStatus;
  priority?: CasePriority;
  category?: CaseCategory;
  participants: Array<string | User | CaseParticipant>;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReadReceipt {
  userId: string | User;
  readAt: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  _id: string;
  caseId: string | Case;
  senderId: string | User;
  type: MessageType;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  replyTo?: string | Message | null;
  mentions?: Array<string | User>;
  isDeleted: boolean;
  deletedAt?: string;
  editedAt?: string;
  readBy: ReadReceipt[];
  reactions?: Reaction[];
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  recipientId: string | User;
  type: NotificationType;
  title: string;
  body: string;
  caseId?: string | Case;
  messageId?: string | Message;
  actorId?: string | User;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagePage {
  messages: Message[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CasePage {
  cases: Case[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  user?: User;
  token?: string;
}

export type VaultCategory = "all" | "image" | "media" | "document" | "link";

export interface VaultItem {
  id: string;
  messageId: string;
  category: VaultCategory;
  type: MessageType | "link";
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileMimeType?: string;
  url?: string;
  content?: string;
  sender?: User;
  createdAt: string;
}

export interface VaultResponse {
  items: VaultItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export type AnnotationTool = "select" | "pen" | "highlighter" | "text" | "rectangle" | "arrow";

export interface AnnotationCoordinates {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: Array<{ x: number; y: number }>;
}

export interface AnnotationStyle {
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
}

export interface Annotation {
  _id: string;
  caseId: string;
  messageId?: string | null;
  fileUrl: string;
  pageNumber: number;
  type: Exclude<AnnotationTool, "select">;
  coordinates: AnnotationCoordinates;
  style: AnnotationStyle;
  text?: string;
  createdBy: User | { _id: string; name?: string; email?: string; avatar?: string; color?: string };
  createdAt: string;
  updatedAt: string;
}


