import type { Page } from "@playwright/test"

// ─── Shared mock data ────────────────────────────────────────────────────────

export const mockUser = {
  _id: "user-1",
  employeeId: "EMP001",
  name: "Alice Smith",
  email: "alice@example.com",
  phone: "9876543210",
  lastSeen: null,
  pinnedCases: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
}

export const mockCase = {
  _id: "case-1",
  title: "Test Case Alpha",
  description: "A test case",
  creatorId: mockUser,
  status: "active",
  participants: [mockUser],
  isPinned: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
}

export const mockMessages = [
  {
    _id: "m-1",
    senderId: mockUser,
    content: "Hello world message",
    isSystemMessage: false,
    createdAt: "2024-01-01T01:00:00.000Z",
  },
  {
    _id: "m-2",
    senderId: mockUser,
    content: "Second test message",
    isSystemMessage: false,
    createdAt: "2024-01-01T01:05:00.000Z",
  },
]

export const mockTasks = [
  {
    _id: "t-1",
    title: "Review Docs",
    priority: "high",
    status: "todo",
    caseId: "case-1",
    createdBy: mockUser,
    assignees: [],
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "t-2",
    title: "Contact Client",
    priority: "medium",
    status: "in_progress",
    caseId: "case-1",
    createdBy: mockUser,
    assignees: [mockUser],
    createdAt: "2024-01-01T00:00:00.000Z",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Register API route mocks for the authenticated dashboard shell. */
export async function setupAuthAndDashboardMocks(page: Page) {
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, user: mockUser }),
    }),
  )

  await page.route("**/api/v1/cases", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [mockCase] }),
      })
    }
    return route.continue()
  })

  await page.route("**/api/v1/cases/*/unread-count", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
    }),
  )

  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    }),
  )

  await page.route("**/api/v1/notifications/unread-count**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
    }),
  )

  await page.route("**/api/v1/cases/*/meeting/active**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: null }),
    }),
  )
}

/**
 * Inject JWT token into localStorage and navigate to dashboard.
 * IMPORTANT: Call setupAuthAndDashboardMocks() BEFORE this.
 */
export async function loginViaLocalStorage(page: Page) {
  // First visit — page context created, may redirect to /login
  await page.goto("/")
  await page.evaluate(() => {
    localStorage.setItem("caseroom_auth_token", "mock-jwt-token")
  })
  // Second visit picks up the token
  await page.goto("/")
}

/**
 * Set up all case-room mocks (messages, participants, tasks, AI)
 * and navigate into the case. Includes dashboard-level mocks.
 *
 * Call BEFORE loginViaLocalStorage — mocks must be registered before navigation.
 */
export async function setupCaseRoomMocks(page: Page, caseId = "case-1") {
  await setupAuthAndDashboardMocks(page)

  await page.route(`**/api/v1/cases/${caseId}`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: mockCase }),
      })
    }
    return route.continue()
  })

  await page.route(`**/api/v1/cases/${caseId}/participants`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [mockUser] }),
    }),
  )

  await page.route(`**/api/v1/cases/${caseId}/messages**`, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            _id: "m-new",
            senderId: mockUser,
            content: "New Message",
            isSystemMessage: false,
            createdAt: new Date().toISOString(),
          },
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          messages: mockMessages,
          page: 1,
          totalPages: 1,
          total: mockMessages.length,
        },
      }),
    })
  })

  await page.route(`**/api/v1/cases/${caseId}/tasks`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: mockTasks }),
    }),
  )

  await page.route("**/api/v1/ai/conversations**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    }),
  )
}

/**
 * Full helper: set up mocks, login, navigate into a case room.
 */
export async function navigateToCase(page: Page, caseId = "case-1") {
  await setupCaseRoomMocks(page, caseId)
  await loginViaLocalStorage(page)
  // Click on the case in sidebar to navigate
  await page.getByText("Test Case Alpha").click()
  await page.waitForURL(`**/case/${caseId}`, { timeout: 8000 })
}
