import api from "./api"
import type { User } from "../types"

const SEARCH_MIN_LENGTH = 1

interface SearchUsersResponse {
  success: boolean
  data: User[]
}

export interface UpdateProfileDto {
  name?: string
  phone?: string
  roleName?: string
  skills?: string[] | string
}

/**
 * Search users by name, employeeId, roleName, or skills.
 */
export const searchUsers = async (
  query: string,
  excludeIds: string[] = [],
): Promise<User[]> => {
  const trimmed = query.trim()

  if (trimmed.length < SEARCH_MIN_LENGTH) {
    throw new Error(
      `Search query must be at least ${SEARCH_MIN_LENGTH} character.`,
    )
  }

  const params: Record<string, string> = { q: trimmed }

  if (excludeIds.length > 0) {
    params.excludeIds = excludeIds.join(",")
  }

  const response = await api.get<SearchUsersResponse>("/users/search", {
    params,
  })

  return response.data.data
}

/**
 * Fetch current user profile
 */
export const getProfile = async (): Promise<User> => {
  const response = await api.get<{ success: boolean; data: User }>("/users/profile")
  return response.data.data
}

/**
 * Update user profile (name, phone, roleName, skills)
 */
export const updateProfile = async (dto: UpdateProfileDto): Promise<User> => {
  const response = await api.put<{ success: boolean; data: User }>("/users/profile", dto)
  return response.data.data
}
