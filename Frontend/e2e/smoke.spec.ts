import { expect, test } from "@playwright/test"

test("app loads and shows login page for unauthenticated users", async ({
  page,
}) => {
  // No valid token — getMe returns 401
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

  // Should redirect to login and render the CaseRoom branding
  await expect(page.getByRole("heading", { name: /caseroom/i })).toBeVisible()
  await expect(page.getByText(/sign in to your account/i)).toBeVisible()
})

test("responsive layout check on mobile", async ({ page }) => {
  // Set viewport to mobile
  await page.setViewportSize({ width: 375, height: 667 })
  
  await page.goto("/login")
  
  // Login form should still be visible and centered
  const loginForm = page.locator("form")
  await expect(loginForm).toBeVisible()
  
  // Branding should be visible
  await expect(page.getByText(/CaseRoom/i)).toBeVisible()
})

test("keyboard navigation - focusing inputs", async ({ page }) => {
  await page.goto("/login")

  await page.locator("#login-employee-id").click()
  await page.keyboard.type("EMP123")
  await expect(page.locator("#login-employee-id")).toHaveValue("EMP123")
})
