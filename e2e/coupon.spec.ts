import { test, expect } from "@playwright/test";
import { setAdminAuth } from "./auth-helpers";

/**
 * E2E smoke test: Coupon Management System (ADR-007)
 *
 * API calls are mocked — no real database needed.
 */

const mockCoupons = [
  {
    id: "c1",
    name: "Summer Sale",
    code: "summer-sale",
    description: "20% off",
    quantity: 50,
    isActive: true,
    createdAt: "2026-08-14T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "c2",
    name: "Welcome",
    code: "welcome",
    description: "HK$50 off first purchase",
    quantity: 10,
    isActive: false,
    createdAt: "2026-08-13T10:00:00.000Z",
    updatedAt: "2026-08-13T10:00:00.000Z",
  },
];

test.describe("Coupon Management", () => {
  test("admin: /admin/coupons shows coupon list", async ({ page }) => {
    await setAdminAuth(page);

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin-1", email: "admin@test", name: "Admin", role: "ADMIN" },
          expires: "2099-01-01",
        }),
      }),
    );

    await page.route("**/api/admin/coupons", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCoupons),
      }),
    );

    await page.goto("/admin/coupons");
    await page.waitForLoadState("networkidle");

    // Verify coupon names appear in the table
    await expect(page.locator('td:has-text("Summer Sale")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td:has-text("Welcome")')).toBeVisible();
  });

  test("admin: create button is visible", async ({ page }) => {
    await setAdminAuth(page);

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin-1", email: "admin@test", name: "Admin", role: "ADMIN" },
          expires: "2099-01-01",
        }),
      }),
    );

    await page.route("**/api/admin/coupons", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );

    await page.goto("/admin/coupons");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "新增" })).toBeVisible({ timeout: 10000 });
    // Empty state
    await expect(page.getByText("暫無優惠券")).toBeVisible();
  });

  test("admin: quick-fill buttons populate description", async ({ page }) => {
    await setAdminAuth(page);

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin-1", email: "admin@test", name: "Admin", role: "ADMIN" },
          expires: "2099-01-01",
        }),
      }),
    );

    await page.route("**/api/admin/coupons", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );

    await page.goto("/admin/coupons");
    await page.waitForLoadState("networkidle");

    // Click "新增" to open the form
    await page.getByRole("button", { name: "新增" }).click();

    // Click a quick-fill button
    await page.getByRole("button", { name: "8折" }).click();

    // Verify description textarea is populated
    const desc = page.locator("#coupon-description");
    await expect(desc).toHaveValue("8折");
  });
});
