import { test, expect } from "@playwright/test";
import { setAdminAuth } from "./auth-helpers";

/**
 * E2E smoke test: Monthly Revenue Report (ADR-009)
 *
 * All API calls are mocked — no real database needed.
 * A valid NextAuth JWT cookie is set so the middleware allows
 * access to /admin/* without redirecting to /login.
 */

const AUGUST_REPORT = {
  month: "2026-08",
  earned: 1500,
  spent: 400,
  net: 1100,
  revenueByType: { ORDER: 1200, TOURNAMENT: 300 },
  expenses: [
    {
      productName: "Pikachu",
      condition: "NM",
      isFoil: true,
      quantity: 2,
      unitCost: 100,
      total: 200,
      arrivedAt: "2026-08-05",
    },
    {
      productName: "Charizard",
      condition: "LP",
      isFoil: false,
      quantity: 1,
      unitCost: 200,
      total: 200,
      arrivedAt: "2026-08-10",
    },
  ],
};

const JULY_REPORT = {
  ...AUGUST_REPORT,
  month: "2026-07",
  earned: 900,
  spent: 0,
  net: 900,
  revenueByType: { ORDER: 900, TOURNAMENT: 0 },
  expenses: [],
};

test.describe("Monthly Revenue Report", () => {
  test.beforeEach(async ({ page }) => {
    await setAdminAuth(page);

    // Mock client-side session provider
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "admin-1",
            email: "admin@test.com",
            name: "Admin",
            role: "ADMIN",
          },
        }),
      }),
    );

    // Mock reports API — respond per requested month
    await page.route("**/api/admin/reports?*", (route) => {
      const url = new URL(route.request().url());
      const month = url.searchParams.get("month");
      const report = month === "2026-07" ? JULY_REPORT : AUGUST_REPORT;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(report),
      });
    });
  });

  test("sidebar shows the report entry and page renders summary cards", async ({ page }) => {
    await page.goto("/admin/reports");

    // Summary cards
    await expect(page.getByText("收入").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("支出").first()).toBeVisible();
    await expect(page.getByText("淨利").first()).toBeVisible();
    await expect(page.getByText("HK$1,500.00")).toBeVisible();
    await expect(page.getByText("HK$400.00")).toBeVisible();
    await expect(page.getByText("HK$1,100.00")).toBeVisible();
  });

  test("revenue split and expense table render", async ({ page }) => {
    await page.goto("/admin/reports");

    await expect(page.getByText("收入來源")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("產品訂單")).toBeVisible();
    await expect(page.getByText("賽事")).toBeVisible();
    await expect(page.getByText("HK$1,200.00")).toBeVisible();

    await expect(page.getByText("到貨支出")).toBeVisible();
    await expect(page.getByText("Pikachu")).toBeVisible();
    await expect(page.getByText("Charizard")).toBeVisible();
    await expect(page.getByText("2026-08-05")).toBeVisible();
  });

  test("month navigation refetches the previous month", async ({
    page,
  }) => {
    // Clock-independent mock: echo the requested month with empty expenses
    // and all-unique figures (no strict-mode text collisions)
    await page.route("**/api/admin/reports?*", (route) => {
      const url = new URL(route.request().url());
      const month = url.searchParams.get("month") ?? "";
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          month,
          earned: 900,
          spent: 100,
          net: 800,
          revenueByType: { ORDER: 700, TOURNAMENT: 200 },
          expenses: [],
        }),
      });
    });

    await page.goto("/admin/reports");
    await expect(page.getByText("收入來源")).toBeVisible({ timeout: 10000 });

    const monthBefore = await page.locator('input[type="month"]').inputValue();

    // Navigate to previous month (chevron button)
    await page.getByRole("button", { name: "上一個月" }).click();

    // Echoed month means the picker changed and the report re-rendered
    await expect(page.getByText("本月沒有到貨記錄")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("HK$800.00").first()).toBeVisible();
    const monthAfter = await page
      .locator('input[type="month"]')
      .inputValue();
    expect(monthAfter).not.toBe(monthBefore);
  });

  test("CSV export downloads a file", async ({ page }) => {
    // Mock the CSV download
    await page.route("**/api/admin/reports/export*", (route) =>
      route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="revenue-report-2026-08.csv"',
        },
        body: "\uFEFF月份,2026-08\n收入,1500",
      }),
    );

    await page.goto("/admin/reports");
    await expect(page.getByText("收入來源")).toBeVisible({ timeout: 10000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "匯出 CSV" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("revenue-report");
  });

  test("sidebar contains 收益報告 link", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(
      page.getByRole("link", { name: "收益報告" }),
    ).toBeVisible({ timeout: 10000 });
  });
});
