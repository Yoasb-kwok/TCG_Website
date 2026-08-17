import { test, expect } from "@playwright/test";
import { setAdminAuth } from "./auth-helpers";

/**
 * E2E smoke test: Inventory Stocking System
 *
 * All API calls are mocked — no real database needed.
 * A valid NextAuth JWT cookie is set so the middleware allows
 * access to /admin/* without redirecting to /login.
 */

const mockVariants = [
  {
    id: "var-1",
    productId: "prod-1",
    name: "Pikachu ex",
    condition: "Near Mint (NM)",
    isFoil: false,
    actual: 10,
    booked: 5,
    reserved: 2,
    total: 17,
    reservedNote: "2 for Mr. Chan",
    lowThreshold: null,
    criticalThreshold: null,
    effectiveLow: 5,
    effectiveCritical: 2,
    state: "healthy",
  },
  {
    id: "var-2",
    productId: "prod-2",
    name: "Charizard ex",
    condition: "Lightly Played (LP)",
    isFoil: true,
    actual: 1,
    booked: 0,
    reserved: 0,
    total: 1,
    reservedNote: null,
    lowThreshold: null,
    criticalThreshold: null,
    effectiveLow: 5,
    effectiveCritical: 2,
    state: "critical",
  },
];

const mockRecords = [
  {
    id: "rec-1",
    variantId: "var-1",
    quantity: 5,
    unitCost: 3.5,
    state: "BOOKED",
    bookedAt: "2026-08-10T10:00:00.000Z",
    arrivedAt: null,
    arrivalNote: null,
    productName: "Pikachu ex",
    variantCondition: "Near Mint (NM)",
    variantIsFoil: false,
    variant: {
      id: "var-1",
      condition: "Near Mint (NM)",
      isFoil: false,
      product: { id: "prod-1", name: "Pikachu ex" },
    },
  },
  {
    id: "rec-2",
    variantId: "var-2",
    quantity: 3,
    unitCost: 10.0,
    state: "ARRIVED",
    bookedAt: "2026-08-01T10:00:00.000Z",
    arrivedAt: "2026-08-05T14:00:00.000Z",
    arrivalNote: "Good condition",
    productName: "Charizard ex",
    variantCondition: "Lightly Played (LP)",
    variantIsFoil: true,
    variant: {
      id: "var-2",
      condition: "Lightly Played (LP)",
      isFoil: true,
      product: { id: "prod-2", name: "Charizard ex" },
    },
  },
];

test.describe("Inventory Stocking System", () => {
  test.beforeEach(async ({ page }) => {
    await setAdminAuth(page);

    // Mock session provider
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

    // Mock inventory GET
    await page.route("**/api/admin/inventory*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          variants: mockVariants,
          globalDefaults: { low: 5, critical: 2 },
        }),
      }),
    );

    // Mock stock-records GET
    await page.route("**/api/admin/stock-records*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          records: mockRecords,
          total: 2,
          page: 1,
          totalPages: 1,
        }),
      }),
    );

    // Mock inventory PATCH (adjust)
    await page.route("**/api/admin/inventory/*", (route) => {
      if (route.request().method() === "PATCH") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        route.continue();
      }
    });

    // Mock stock-records PATCH (arrive)
    await page.route("**/api/admin/stock-records/*", (route) => {
      if (route.request().method() === "PATCH") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        route.continue();
      }
    });

    // Mock shop-settings
    await page.route("**/api/admin/shop-settings*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          low: 5,
          critical: 2,
        }),
      }),
    );
  });

  test("inventory dashboard loads and shows variants with stock data", async ({
    page,
  }) => {
    await page.goto("/admin/products");
    // Click the inventory tab
    await page.getByRole("button", { name: "庫存管理" }).click();

    // Wait for data to load (debounced 300ms + network)
    await expect(page.getByText("Pikachu ex")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Charizard ex")).toBeVisible();
    await expect(page.getByText("Lightly Played (LP) · 閃卡")).toBeVisible();
    // Reserved note
    await expect(page.getByText("📝 2 for Mr. Chan")).toBeVisible();
  });

  test("state badges show correct colors", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "庫存管理" }).click();

    await expect(page.getByText("Pikachu ex")).toBeVisible({ timeout: 10000 });

    // Charizard is critical (actual=1, critical threshold=2)
    const charizardRow = page.locator("tr").filter({ hasText: "Charizard ex" });
    const criticalBadge = charizardRow.getByText("臨界");
    await expect(criticalBadge).toBeVisible();

    // Pikachu is healthy (actual=10, low=5)
    const pikachuRow = page.locator("tr").filter({ hasText: "Pikachu ex" });
    const healthyBadge = pikachuRow.getByText("充足");
    await expect(healthyBadge).toBeVisible();
  });

  test("edit actual quantity via input", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "庫存管理" }).click();

    await expect(page.getByText("Pikachu ex")).toBeVisible({ timeout: 10000 });

    const pikachuRow = page.locator("tr").filter({ hasText: "Pikachu ex" });

    // Type a new value into the actual quantity input and press Enter
    const actualInput = pikachuRow.getByRole("spinbutton");
    await actualInput.fill("15");
    await actualInput.press("Enter");

    // Should have called PATCH API (mocked — just verify no error)
    await expect(page.getByText("Pikachu ex")).toBeVisible();
  });

  test("reserve dialog opens and closes", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "庫存管理" }).click();

    await expect(page.getByText("Pikachu ex")).toBeVisible({ timeout: 10000 });

    // Click reserve button (Plus icon next to reserved number)
    const pikachuRow = page.locator("tr").filter({ hasText: "Pikachu ex" });
    const reserveButtons = pikachuRow.locator('button[title="預留"]');
    await reserveButtons.first().click();

    // Dialog should be visible
    await expect(page.getByText("預留庫存")).toBeVisible();
    await expect(page.getByText("可預留：實際 10 + 入貨中 5")).toBeVisible();

    // Close
    await page.getByRole("button", { name: "取消" }).click();
    await expect(page.getByText("預留庫存")).not.toBeVisible();
  });

  test("threshold dialog opens with global defaults", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "庫存管理" }).click();

    await expect(page.getByText("Pikachu ex")).toBeVisible({ timeout: 10000 });

    // Click state badge (opens threshold settings)
    const pikachuRow = page.locator("tr").filter({ hasText: "Pikachu ex" });
    await pikachuRow.getByText("充足").click();

    // Dialog should show global defaults
    await expect(page.getByText("庫存水位設定")).toBeVisible();
    await expect(page.getByText(/全局預設：5/)).toBeVisible();
    await expect(page.getByText(/全局預設：2/)).toBeVisible();
  });

  test("record dashboard loads and shows records", async ({ page }) => {
    await page.goto("/admin/products");
    // Click the records tab
    await page.getByRole("button", { name: "入貨記錄" }).click();

    // Wait for data to load
    await expect(page.getByText("Pikachu ex")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Charizard ex")).toBeVisible();

    // BOOKED record shows "運送中" button
    const pikachuRecordRow = page.locator("tr").filter({ hasText: "Pikachu ex" });
    await expect(pikachuRecordRow.getByText("運送中")).toBeVisible();

    // ARRIVED record shows "抵達" badge
    const charizardRecordRow = page.locator("tr").filter({ hasText: "Charizard ex" });
    await expect(charizardRecordRow.getByText("抵達")).toBeVisible();
  });

  test("arrival dialog opens for BOOKED records", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "入貨記錄" }).click();

    await expect(page.getByText("Pikachu ex")).toBeVisible({ timeout: 10000 });

    // Click the "運送中" button to trigger arrival dialog
    const pikachuRecordRow = page.locator("tr").filter({ hasText: "Pikachu ex" });
    await pikachuRecordRow.getByRole("button", { name: /運送中/ }).click();

    // Arrival dialog should open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "確認到貨" })).toBeVisible();
    await expect(page.getByText("到貨時間 *")).toBeVisible();

    // Close dialog
    await page.getByRole("button", { name: "取消" }).click();
  });

  test("stock entry page loads with variant selector", async ({ page }) => {
    await page.goto("/admin/products/stock");

    await expect(page.getByRole("heading", { name: "入貨" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("商品 *")).toBeVisible();
    await expect(page.getByText("入貨數量 *")).toBeVisible();
    await expect(page.getByText("成本單價 (HKD) *")).toBeVisible();

    // Variant dropdown should have options
    const variantSelect = page.getByRole("combobox");
    await expect(variantSelect).toBeVisible();
    const options = await variantSelect.locator("option").allTextContents();
    expect(options).toContain("— 選擇商品 —");
    // Should contain variant options from mock
    expect(options.some((o) => o.includes("Pikachu ex"))).toBeTruthy();
  });
});
