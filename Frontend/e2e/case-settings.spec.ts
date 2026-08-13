import { test, expect } from "@playwright/test";



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
};

const buildMockCase = (id: string, title: string, isPinned = false) => ({
  _id: id,
  title,
  description: "",
  creatorId: mockUser,
  status: "active",
  participants: [mockUser],
  isPinned,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

// Authenticate by injecting the token into localStorage and mocking /auth/me
const setupAuth = async (
  page: Parameters<Parameters<(typeof test)["beforeEach"]>[0]>[0],
) => {
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, user: mockUser }),
    }),
  );

  // Mock GET /notifications
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    }),
  );

  // Mock GET /notifications/unread-count
  await page.route("**/api/v1/notifications/unread-count**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
    }),
  );

  // Mock GET /cases/*/meeting/active
  await page.route("**/api/v1/cases/*/meeting/active**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: null }),
    }),
  );

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("caseroom_auth_token", "mock-jwt-token");
  });
};

test.describe("Case Settings", () => {
  test("pinning more than 5 cases shows error", async ({ page }) => {
    // Build 5 already-pinned cases + 1 unpinned
    const pinnedCases = Array.from({ length: 5 }, (_, i) =>
      buildMockCase(`case-pinned-${i}`, `Pinned Case ${i + 1}`, true),
    );
    const extraCase = buildMockCase("case-extra", "Extra Case", false);
    const allCases = [...pinnedCases, extraCase];

    await setupAuth(page);

    // Stub GET /cases
    await page.route("**/api/v1/cases**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: allCases }),
        });
      } else {
        route.continue();
      }
    });

    // Stub unread-count for each case
    await page.route("**/api/v1/cases/*/unread-count", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
      }),
    );

    // Stub PUT /cases/case-extra/pin → 400 (already at limit)
    await page.route("**/api/v1/cases/case-extra/pin", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "You can only pin up to 5 cases",
          }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate so the auth effect fires with the injected token
    await page.goto("/");

    // Wait for sidebar to render the extra (unpinned) case
    await expect(page.getByText("Extra Case")).toBeVisible({ timeout: 8000 });

    // Listen for browser dialogs triggered by the pin error
    let pinErrorDialogSeen = false;
    page.on("dialog", async (dialog) => {
      if (dialog.message().toLowerCase().includes("pin")) {
        pinErrorDialogSeen = true;
      }
      await dialog.accept();
    });

    // Attempt to pin the extra case (should trigger error)
    const pinBtn = page
      .getByRole("link", { name: /Extra Case/i })
      .locator("button[aria-label='Pin case']");
    await pinBtn.click({ force: true });

    // Allow time for the alert to fire
    await page.waitForTimeout(500);

    // The pin button's click triggers an alert containing the word "pin"
    // (see CaseSidebar: pinCase(id).catch((e) => alert(e.message)))
    expect(pinErrorDialogSeen).toBe(true);
  });

  test("archive and delete a case", async ({ page }) => {
    page.on("console", (msg) => console.log(msg.type(), msg.text()));
    page.on("response", (res) => {
      if (res.status() === 401) console.log("401 from URL:", res.url());
    });
    
    const targetCase = buildMockCase("case-to-delete", "To Be Deleted Case");

    await setupAuth(page);

    // Stub GET /cases
    let casesData = [targetCase];
    await page.route("**/api/v1/cases", (route) => {
      if (route.request().method() === "GET") {
        console.log("MOCK GET /cases called");
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: casesData }),
        });
      } else {
        route.continue();
      }
    });

    // Stub unread-count
    await page.route("**/api/v1/cases/*/unread-count", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
      }),
    );
    
    // Stub /participants
    await page.route("**/api/v1/cases/*/participants", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [mockUser] }),
        });
      } else {
        route.continue();
      }
    });

    // Stub /messages
    await page.route("**/api/v1/cases/*/messages**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { messages: [], page: 1, totalPages: 1, total: 0 },
          }),
        });
      } else {
        route.continue();
      }
    });

    // Stub GET /cases/:id and DELETE /cases/:id
    await page.route("**/api/v1/cases/case-to-delete", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: targetCase }),
        });
      } else if (route.request().method() === "DELETE") {
        // After deletion, empty the case list
        console.log("MOCK DELETE called");
        casesData = [];
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Case deleted" }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/");

    // Wait for sidebar to render the target case
    await expect(
      page.getByText("To Be Deleted Case"),
    ).toBeVisible({ timeout: 8000 });

    // Navigate into the case
    await page.getByRole('link', { name: 'Case: To Be Deleted Case' }).click();
    await page.waitForURL("**/case/case-to-delete", { timeout: 5000 });

    // Open settings panel via the settings button in the chat header
    await page.click('button[aria-label="Case settings"]');

    await expect(
      page.locator("h3, h2").filter({ hasText: /case settings/i }),
    ).toBeVisible();

    // Click Delete Case
    await page.click('button:has-text("Delete Case")');

    // Confirmation dialog
    const deleteConfirm = page.locator(
      '[role="dialog"] >> button:has-text("Delete")',
    );
    await expect(deleteConfirm).toBeVisible();
    await deleteConfirm.click();

    // Give it a brief moment
    await page.waitForTimeout(500);

    // Case should no longer appear in the sidebar
    await expect(
      page.getByText("To Be Deleted Case"),
    ).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByText("Select a case to get started")).toBeVisible();
  });
});
