import { test, expect } from "@playwright/test"
import { navigateToCase, setupCaseRoomMocks, loginViaLocalStorage, mockMessages } from "./fixtures"

test.describe("Messaging in Case Room", () => {
  test("message area renders loaded messages", async ({ page }) => {
    await navigateToCase(page)

    await expect(page.getByText("Hello world message")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Second test message")).toBeVisible({ timeout: 8000 })
  })

  test("message input is visible and accepts text", async ({ page }) => {
    await navigateToCase(page)

    const input = page.getByPlaceholder(/type a message|message/i)
      .or(page.locator("textarea").last())
    await expect(input).toBeVisible({ timeout: 8000 })
    await input.fill("Writing a new message")
    await expect(input).toHaveValue("Writing a new message")
  })

  test("empty state when no messages", async ({ page }) => {
    await setupCaseRoomMocks(page)

    // Override messages mock to return empty list
    await page.route("**/api/v1/cases/case-1/messages**", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { messages: [], page: 1, totalPages: 1, total: 0 },
          }),
        })
      }
      return route.continue()
    })

    await loginViaLocalStorage(page)
    await page.getByText("Test Case Alpha").click()
    await page.waitForURL("**/case/case-1", { timeout: 8000 })

    // Message input should still be visible even with no messages
    const input = page.getByPlaceholder(/type a message|message/i)
      .or(page.locator("textarea").last())
    await expect(input).toBeVisible({ timeout: 8000 })
  })
})
