import { test, expect } from "@playwright/test"

test.describe("RBAC & Protected Routes", () => {
  test("unauthenticated user on /dashboard is redirected to /login", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Not authorized, no token",
        }),
      }),
    )

    await page.goto("/")
    await page.waitForURL("**/login")

    await expect(page.getByText(/sign in to your account/i)).toBeVisible()
  })

  test("unauthenticated user on /case/:id is redirected to /login", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Not authorized, no token",
        }),
      }),
    )

    await page.goto("/case/nonexistent-id")
    await page.waitForURL("**/login")

    await expect(page.getByText(/sign in to your account/i)).toBeVisible()
  })

  test("accessing non-existent route redirects authenticated user to dashboard", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            _id: "user-1",
            employeeId: "EMP001",
            name: "Alice Smith",
            email: "alice@example.com",
            phone: "9876543210",
            lastSeen: null,
            pinnedCases: [],
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        }),
      }),
    )

    await page.route("**/api/v1/cases**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
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

    await page.goto("/")
    await page.evaluate(() => {
      localStorage.setItem("caseroom_auth_token", "mock-jwt-token")
    })
    await page.goto("/this-route-does-not-exist")

    // Should land on dashboard (/ redirect)
    await expect(
      page.getByText(/select a case to get started/i),
    ).toBeVisible({ timeout: 8000 })
  })
})
