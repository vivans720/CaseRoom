import { test, expect } from "@playwright/test"

// These tests mock the API using Playwright route interception.
// We avoid hard-coding the dev-server origin so localStorage is always set
// on the correct origin (Playwright's baseURL via page.goto("/")).



const mockUser = {
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

const mockCase = {
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

type Page = Parameters<Parameters<(typeof test)["beforeEach"]>[0]>[0]

const setupAuthMocks = async (page: Page, cases = [mockCase]) => {
  // Mock GET /auth/me — always return the mock user (token is injected via localStorage)
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, user: mockUser }),
    }),
  )

  // Mock GET /cases
  await page.route("**/api/v1/cases**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: cases }),
      })
    } else {
      route.continue()
    }
  })

  // Mock GET /cases/*/unread-count (glob wildcard works with Playwright)
  await page.route("**/api/v1/cases/*/unread-count**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
    }),
  )

  // Mock GET /notifications
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    }),
  )

  // Mock GET /notifications/unread-count
  await page.route("**/api/v1/notifications/unread-count**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
    }),
  )
}

// Inject the auth token into localStorage using the page's own origin so there
// are no cross-origin storage isolation issues.
const loginViaLocalStorage = async (page: Page) => {
  // First visit so the page context exists (may redirect to /login — that's fine)
  await page.goto("/")
  await page.evaluate(() => {
    localStorage.setItem("caseroom_auth_token", "mock-jwt-token")
  })
  // Second visit picks up the token and the auth context validates the session
  await page.goto("/")
}

test.describe("Dashboard — layout smoke", () => {
  test("shows sidebar and empty state on load", async ({ page }) => {
    await setupAuthMocks(page)
    await loginViaLocalStorage(page)

    // Sidebar brand should be visible
    await expect(page.getByText("CaseRoom")).toBeVisible({ timeout: 8000 })

    // Case from mock API should appear in the sidebar
    await expect(page.getByText("Test Case Alpha")).toBeVisible({ timeout: 8000 })
  })

  test("shows empty state center area when no case is selected", async ({ page }) => {
    await setupAuthMocks(page)
    await loginViaLocalStorage(page)

    await expect(
      page.getByText("Select a case to get started"),
    ).toBeVisible({ timeout: 8000 })
  })
})

test.describe("Dashboard — responsive layout", () => {
  test("mobile viewport shows sidebar and dashboard chrome", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await setupAuthMocks(page)
    await loginViaLocalStorage(page)

    await expect(page.getByText("CaseRoom")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Test Case Alpha")).toBeVisible({ timeout: 8000 })
    await expect(
      page.getByText("Select a case to get started"),
    ).toBeVisible({ timeout: 8000 })
  })

  test("desktop viewport shows sidebar and dashboard chrome", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await setupAuthMocks(page)
    await loginViaLocalStorage(page)

    await expect(page.getByText("CaseRoom")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Test Case Alpha")).toBeVisible({ timeout: 8000 })
    await expect(
      page.getByText("Select a case to get started"),
    ).toBeVisible({ timeout: 8000 })
  })
})

test.describe("Dashboard — create case flow", () => {
  test("creates a case and navigates to it", async ({ page }) => {
    const newCase = {
      ...mockCase,
      _id: "case-new",
      title: "Brand New Case",
    }

    // Set up auth + initial GET /cases mock first
    await setupAuthMocks(page)

    // Override /cases to handle both GET (returns updated list) and POST (creates)
    // page.route() prepends — the last registered handler runs first, so this
    // Takes priority over the GET handler registered inside setupAuthMocks.
    await page.route("**/api/v1/cases**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Case created",
            data: newCase,
          }),
        })
      } else {
        // GET — return both cases so the sidebar refreshes correctly
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [mockCase, newCase] }),
        })
      }
    })

    await loginViaLocalStorage(page)

    // Wait for dashboard to load
    await expect(page.getByText("CaseRoom")).toBeVisible({ timeout: 8000 })

    // Click New Case button (id set in CaseSidebar footer)
    await page.click("#new-case-button")

    // Modal should open
    await expect(page.getByRole("dialog")).toBeVisible()

    // Fill in the title using the input's id
    await page.fill("#create-case-title", "Brand New Case")

    // Submit via the button's id
    await page.click("#create-case-submit")

    // Should navigate to the new case URL
    await expect(page).toHaveURL(/\/case\/case-new/, { timeout: 8000 })
  })
})
