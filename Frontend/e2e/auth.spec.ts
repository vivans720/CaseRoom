import { expect, test } from "@playwright/test"

test.describe("Auth pages", () => {
  test("unauthenticated user on / is redirected to /login", async ({
    page,
  }) => {
    // Intercept getMe to return 401 (no valid session)
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

    await expect(page.getByRole("heading", { name: /caseroom/i })).toBeVisible()
    await expect(page.getByText(/sign in to your account/i)).toBeVisible()
  })

  test("login page renders form fields", async ({ page }) => {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unauthorized" }),
      }),
    )

    await page.goto("/login")

    await expect(page.getByLabel(/employee id/i)).toBeVisible()
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible()
    await expect(page.getByLabel(/remember me/i)).toBeVisible()
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible()
  })

  test("register page renders form fields", async ({ page }) => {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unauthorized" }),
      }),
    )

    await page.goto("/register")

    await expect(page.getByLabel(/employee id/i)).toBeVisible()
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/phone/i)).toBeVisible()
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    // Step-1 submit button advances to the OTP verification screen
    await expect(
      page.getByRole("button", { name: /next.*verify.*email/i }),
    ).toBeVisible()
  })

  test("login/register links navigate between auth pages", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unauthorized" }),
      }),
    )

    // Start at login
    await page.goto("/login")
    await expect(page.getByText(/sign in to your account/i)).toBeVisible()

    // Click register link
    await page.getByRole("link", { name: /register/i }).click()
    await page.waitForURL("**/register")
    await expect(page.getByText(/create your account/i)).toBeVisible()

    // Click sign in link
    await page.getByRole("link", { name: /sign in/i }).click()
    await page.waitForURL("**/login")
    await expect(page.getByText(/sign in to your account/i)).toBeVisible()
  })

  test("successful login redirects to dashboard", async ({ page }) => {
    // Mock GET /auth/me — returns user only when a real session token is present
    await page.route("**/api/v1/auth/me", (route) => {
      const authHeader = route.request().headers()["authorization"]
      if (authHeader?.includes("test-jwt-token")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            user: {
              _id: "u1",
              employeeId: "EMP001",
              name: "Test User",
              email: "test@test.com",
              phone: "1234567890",
              lastSeen: null,
              pinnedCases: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        })
      }
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unauthorized" }),
      })
    })

    // Mock POST /auth/login — initiates OTP challenge
    await page.route("**/api/v1/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OTP sent to your email",
          requireOtp: true,
          tempToken: "temp-token-123",
          email: "test@test.com",
        }),
      }),
    )

    // Mock POST /auth/login/verify — returns the real session
    await page.route("**/api/v1/auth/login/verify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Login successful",
          user: {
            _id: "u1",
            employeeId: "EMP001",
            name: "Test User",
            email: "test@test.com",
            phone: "1234567890",
            lastSeen: null,
            pinnedCases: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          token: "test-jwt-token",
        }),
      }),
    )

    // Mock GET /cases so the dashboard can load
    await page.route("**/api/v1/cases**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      }),
    )

    // Mock GET /notifications so the dashboard can load
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

    await page.goto("/login")

    // Step 1 — fill credentials
    await page.getByLabel(/employee id/i).fill("EMP001")
    await page.getByLabel("Password", { exact: true }).fill("Password1")
    await page.getByRole("button", { name: /sign in/i }).click()

    // Step 2 — OTP screen should appear; type the code
    await expect(page.getByRole("button", { name: /verify code/i })).toBeVisible()
    // Click the first OTP digit input and type the full code — each digit auto-advances focus
    await page.locator("input[inputmode='numeric']").first().click()
    await page.keyboard.type("123456")
    await page.getByRole("button", { name: /verify code/i }).click()

    // Should redirect to dashboard
    page.on("response", (res) => {
      if (res.status() === 401) {
        console.log("FAILED 401 ON URL:", res.url())
      }
    })
    await page.waitForURL("/", { timeout: 10000 })
    await page.waitForTimeout(2000)
    await expect(page.getByText(/select a case to get started/i)).toBeVisible({ timeout: 10000 })
  })

  test("successful registration redirects to dashboard", async ({ page }) => {
    const mockUser = {
      _id: "u2",
      employeeId: "EMP002",
      name: "New User",
      email: "new@test.com",
      phone: "9876543210",
      lastSeen: null,
      pinnedCases: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Mock GET /auth/me — only accepts the real session token
    await page.route("**/api/v1/auth/me", (route) => {
      const authHeader = route.request().headers()["authorization"]
      if (authHeader?.includes("new-jwt-token")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, user: mockUser }),
        })
      }
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unauthorized" }),
      })
    })

    // Mock POST /auth/register/send-otp — triggers OTP email
    await page.route("**/api/v1/auth/register/send-otp", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OTP sent to your email",
        }),
      }),
    )

    // Mock POST /auth/register — completes registration with OTP
    await page.route("**/api/v1/auth/register", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "User registered successfully",
          user: mockUser,
          token: "new-jwt-token",
        }),
      }),
    )

    // Mock GET /cases so the dashboard can load after redirect
    await page.route("**/api/v1/cases**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      }),
    )

    // Mock GET /notifications so the dashboard can load
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

    await page.goto("/register")

    // Step 1 — fill registration details
    await page.getByLabel(/employee id/i).fill("EMP002")
    await page.getByLabel(/full name/i).fill("New User")
    await page.getByLabel(/email/i).fill("new@test.com")
    await page.getByLabel(/phone/i).fill("9876543210")
    await page.getByLabel("Password", { exact: true }).fill("Password1!")
    await page.getByLabel(/confirm password/i).fill("Password1!")
    await page.getByRole("button", { name: /next.*verify.*email/i }).click()

    // Step 2 — OTP entry screen
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible()
    await page.locator("input[inputmode='numeric']").first().click()
    await page.keyboard.type("123456")
    await page.getByRole("button", { name: /create account/i }).click()

    await page.waitForURL("/", { timeout: 10000 })
    await expect(page.getByText(/select a case to get started/i)).toBeVisible({ timeout: 10000 })
  })
})
