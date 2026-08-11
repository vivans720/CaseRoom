import api from "./api"
import type { Case, TaskPriority } from "../types"

export interface ChatSummaryData {
  summary: string
  issues: Array<string | { text: string; sourceMessageId?: string }>
  decisions: Array<string | { text: string; sourceMessageId?: string }>
  pendingWork: Array<string | { text: string; sourceMessageId?: string }>
  finalStatus: string
  caseTitle?: string
  messageCount?: number
  cached?: boolean
  isFresh?: boolean
  newMessagesCount?: number
  generatedAt?: string
}

export interface MeetingActionItem {
  task: string
  assignee?: string
  deadline?: string
  priority?: "high" | "medium" | "low"
  timestamp?: string
}

export interface MeetingDecision {
  decision: string
  madeBy?: string
  timestamp?: string
}

export interface MeetingSummaryData {
  summary: string
  keyTopics: string[]
  discussionPoints?: string[]
  decisions: Array<string | MeetingDecision>
  actionItems: Array<string | MeetingActionItem>
  cached?: boolean
  generatedAt?: string
}

export interface SimilarCaseItem extends Partial<Case> {
  _id: string
  title: string
  description?: string
  status: Case["status"]
  category?: Case["category"]
  similarityPercentage: number
  matchReasons?: string[]
}

export interface DuplicateCandidateItem {
  case: Partial<Case> & { _id: string; title: string; status?: string; category?: string }
  similarityPercentage: number
  matchReason?: string
  isLikelyDuplicate?: boolean
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  similarityPercentage: number
  matchedCase: Partial<Case> | null
  matchedCases?: DuplicateCandidateItem[]
}

export interface ParticipantRecommendation {
  user: {
    _id: string
    name: string
    email: string
    employeeId: string
    roleName?: string
    skills?: string[]
    profilePictureUrl?: string | null
  }
  matchPercentage: number
  matchingSkills: string[]
  pastCasesCount: number
  pastCasesTitles?: string[]
  availabilityStatus?: string
  reason: string
}

export interface TimelineItem {
  time: string
  event: string
  type: "issue" | "finding" | "evidence" | "decision" | "action" | "resolution" | string
  actor: string
  confidence?: "high" | "medium" | "low"
  sourceMessageId?: string | null
  sourceSnippet?: string | null
}

export interface TimelineData {
  timeline: TimelineItem[]
  caseTitle?: string
  messageCount?: number
  cached?: boolean
  generatedAt?: string
}

export interface ExtractedTask {
  title: string
  description: string
  priority: TaskPriority
  dueDate: string | null
  suggestedAssigneeName: string | null
  suggestedAssigneeId: string | null
  confidence?: "high" | "medium" | "low"
  sourceMessageId?: string | null
  sourceSnippet?: string | null
  alreadyExists?: boolean
  existingTaskStatus?: string | null
  selected?: boolean
}

export interface ExtractedTaskResponse {
  tasks: ExtractedTask[]
  caseTitle?: string
  messageCount?: number
}

export interface AICitation {
  sourceType: "message" | "document" | "meeting"
  sourceId: string
  caseId: string
  label: string
  pageNumber?: number
  segment?: string
  relevance: number
}

export interface AIAnswer {
  answer: string
  citations: AICitation[]
  confidence: number
  conversationId: string
}

export interface AIConversation {
  _id: string
  title: string
  scope: "case" | "knowledge" | "document"
  caseId?: string | null
  turns?: Array<{ role: "user" | "assistant"; content: string; citations?: AICitation[]; confidence?: number }>
  updatedAt: string
}

export interface AIInsightSource {
  sourceType: string
  sourceId: string
  pageNumber?: number
  segment?: string
}

export interface AIInsight {
  _id: string
  title: string
  description: string
  confidence: number
  status: "new" | "reviewed" | "dismissed" | "invalidated"
  sources?: AIInsightSource[]
}

export const aiService = {
  getChatSummary: async (caseId: string, forceRefresh = false): Promise<ChatSummaryData> => {
    const response = await api.post("/ai/chat-summary", { caseId, forceRefresh })
    return response.data.data
  },

  getMeetingSummary: async (
    caseId: string,
    meetingId?: string,
    transcript?: string,
  ): Promise<MeetingSummaryData> => {
    const response = await api.post("/ai/meeting-summary", {
      caseId,
      meetingId,
      transcript,
    })
    return response.data.data
  },

  searchCases: async (query: string): Promise<Array<Case & { relevanceScore?: number }>> => {
    const response = await api.get("/ai/search", { params: { q: query } })
    return response.data.data
  },

  getSimilarCases: async (caseId: string): Promise<SimilarCaseItem[]> => {
    const response = await api.get(`/ai/similar-cases/${caseId}`)
    return response.data.data
  },

  checkDuplicate: async (title: string, description?: string): Promise<DuplicateCheckResult> => {
    const response = await api.post("/ai/duplicate-check", { title, description })
    return response.data.data
  },

  recommendParticipants: async (caseId: string): Promise<ParticipantRecommendation[]> => {
    const response = await api.get(`/ai/recommend-participants/${caseId}`)
    return response.data.data
  },

  generateTimeline: async (caseId: string, forceRefresh = false): Promise<TimelineData> => {
    const response = await api.post("/ai/timeline", { caseId, forceRefresh })
    return response.data.data
  },

  extractTasks: async (caseId: string): Promise<ExtractedTaskResponse> => {
    const response = await api.post("/ai/extract-tasks", { caseId })
    return response.data.data
  },

  askCaseAssistant: async (caseId: string, question: string, conversationId?: string): Promise<AIAnswer> => {
    const response = await api.post("/ai/case-assistant", { caseId, question, conversationId })
    return response.data.data
  },

  askDocument: async (caseId: string, documentMessageId: string, question: string, conversationId?: string): Promise<AIAnswer> => {
    const response = await api.post("/ai/document-qa", { caseId, documentMessageId, question, conversationId })
    return response.data.data
  },

  askKnowledge: async (question: string, conversationId?: string): Promise<AIAnswer> => {
    const response = await api.post("/ai/knowledge-assistant", { question, conversationId })
    return response.data.data
  },

  listConversations: async (scope: AIConversation["scope"], caseId?: string): Promise<AIConversation[]> => {
    const response = await api.get("/ai/conversations", { params: { scope, caseId } })
    return response.data.data
  },

  getConversation: async (conversationId: string): Promise<AIConversation> => {
    const response = await api.get(`/ai/conversations/${conversationId}`)
    return response.data.data
  },

  scanContradictions: async (caseId: string): Promise<{ jobId: string }> => {
    const response = await api.post("/ai/contradictions", { caseId })
    return response.data.data
  },

  listInsights: async (caseId: string): Promise<AIInsight[]> => {
    const response = await api.get(`/ai/contradictions/${caseId}`)
    return response.data.data
  },

  updateInsight: async (insightId: string, status: "reviewed" | "dismissed"): Promise<AIInsight> => {
    const response = await api.patch(`/ai/insights/${insightId}`, { status })
    return response.data.data
  },
}

export default aiService
