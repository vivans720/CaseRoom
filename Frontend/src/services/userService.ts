import api from "./api"
import type { User } from "../types"

const SEARCH_MIN_LENGTH = 1

interface SearchUsersResponse {
  success: boolean
  data: User[]
}

/**
 * Search users by name or employeeId.
 *
 * @param query       - Search term (must be at least 1 character)
 * @param excludeIds  - User IDs to exclude from results (e.g. already in the case)
 * @returns           Array of matching User objects
 * @throws            If query is shorter than SEARCH_MIN_LENGTH
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
