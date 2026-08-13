import { test, expect } from "@playwright/test"
import { navigateToCase } from "./fixtures"

test.describe("AI Panel in Case Room", () => {
  test("AI panel toggle button exists in case room header", async ({ page }) => {
    await navigateToCase(page)

    const aiButton = page
      .locator("button[aria-label*='AI' i], button[aria-label*='assistant' i]")
      .or(page.getByRole("button", { name: /ai|assistant/i }))
      .first()
    await expect(aiButton).toBeVisible({ timeout: 8000 })
  })

  test("AI panel opens when toggle is clicked", async ({ page }) => {
    await navigateToCase(page)

    const aiButton = page
      .locator("button[aria-label*='AI' i], button[aria-label*='assistant' i]")
      .or(page.getByRole("button", { name: /ai|assistant/i }))
      .first()
    await aiButton.click()

    // AI panel should show some identifiable content (input, heading, etc.)
    const aiPanel = page
      .getByText(/ai assistant|ask ai|ai summary|case assistant/i)
      .or(page.locator("[class*='ai' i][class*='panel' i]"))
      .first()
    await expect(aiPanel).toBeVisible({ timeout: 8000 })
  })
})
