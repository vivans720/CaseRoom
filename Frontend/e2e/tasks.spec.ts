import { test, expect } from "@playwright/test"
import { navigateToCase } from "./fixtures"

test.describe("Task Panel in Case Room", () => {
  test("task panel toggle opens panel with task list", async ({ page }) => {
    await navigateToCase(page)

    // Open task panel — button may have aria-label or text
    const taskButton = page
      .locator("button[aria-label*='ask' i], button[aria-label*='Task' i]")
      .or(page.getByRole("button", { name: /tasks/i }))
      .first()
    await taskButton.click()

    // Tasks from mock data should be visible
    await expect(page.getByText("Review Docs")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Contact Client")).toBeVisible({ timeout: 8000 })
  })

  test("create task button opens modal", async ({ page }) => {
    await navigateToCase(page)

    // Open task panel
    const taskButton = page
      .locator("button[aria-label*='ask' i], button[aria-label*='Task' i]")
      .or(page.getByRole("button", { name: /tasks/i }))
      .first()
    await taskButton.click()
    await expect(page.getByText("Review Docs")).toBeVisible({ timeout: 8000 })

    // Click create task button
    const createButton = page
      .getByRole("button", { name: /create task|new task|add task/i })
      .or(page.locator("button[aria-label*='add task' i], button[aria-label*='create task' i]"))
      .first()
    await createButton.click()

    // Modal/dialog should appear
    await expect(
      page.locator("[role='dialog']").or(page.locator("[class*='modal' i]")),
    ).toBeVisible({ timeout: 8000 })
  })
})
