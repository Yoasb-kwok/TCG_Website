import { test, expect } from "@playwright/test";
import { setAdminAuth } from "./auth-helpers";

/**
 * E2E smoke test: Points Admin Dashboard
 *
 * All API calls are mocked — no real database needed.
 */

const mockAccounts = [
  {
    email: "alice@test.com",
    name: "Alice Wong",
    type: "USER",
    balance: 150,
    lastEarned: "2026-01-15T10:00:00.000Z",
  },
  {
    email: "guest@test.com",
    name: null,
    type: "GUEST",
    balance: 50,
    lastEarned: "2026-02-01T08:00:00.000Z",
  },
];

test.describe("Points Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await setAdminAuth(page);

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
        }),
      }),
    );

    await page.route("**/api/admin/points*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accounts: mockAccounts }),
      }),
    );
  });

  test("dashboard loads and displays accounts", async ({ page }) => {
    await page.goto("/admin/points");

    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("guest@test.com")).toBeVisible();
    await expect(page.getByText("150")).toBeVisible();
  });

  test("search filters results", async ({ page }) => {
    await page.route("**/api/admin/points*", (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("search") === "alice") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ accounts: [mockAccounts[0]] }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ accounts: mockAccounts }),
        });
      }
    });

    await page.goto("/admin/points");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("guest@test.com")).toBeVisible();

    await page.getByPlaceholder("搜尋電郵、名稱…").fill("alice");

    await expect(page.getByText("Alice Wong")).toBeVisible();
    await expect(page.getByText("guest@test.com")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("edit dialog opens with correct info and requires reason", async ({ page }) => {
    await page.goto("/admin/points");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });

    // Click the first "調整" button (Alice's row)
    const aliceRow = page.locator("tr").filter({ hasText: "Alice Wong" });
    await aliceRow.getByRole("button", { name: "調整" }).click();

    // Dialog should show current balance and email (scope to dialog to avoid table-cell ambiguity)
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("alice@test.com")).toBeVisible();
    await expect(dialog.getByText("150")).toBeVisible({ timeout: 5000 });

    // Reason is required — save button disabled without reason
    const saveButton = page.getByRole("button", { name: "儲存" });
    await expect(saveButton).toBeDisabled();

    // Type a reason → button enables
    await page.getByPlaceholder("必須填寫調整原因…").fill("Compensation");
    await expect(saveButton).toBeEnabled();
  });

  test("edit dialog shows correct delta", async ({ page }) => {
    await page.goto("/admin/points");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });

    const aliceRow = page.locator("tr").filter({ hasText: "Alice Wong" });
    await aliceRow.getByRole("button", { name: "調整" }).click();

    // Change target to 200 — delta should be +50
    await page.getByRole("spinbutton").fill("200");
    await expect(page.getByText("變更：+50 積分")).toBeVisible();
  });
});
