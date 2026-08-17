import { test, expect } from "@playwright/test";
import { setAdminAuth } from "./auth-helpers";

/**
 * E2E smoke test: Transaction Management Dashboard
 *
 * All API calls are mocked — no real database needed.
 * A valid NextAuth JWT cookie is set so the middleware allows
 * access to /admin/* without redirecting to /login.
 */

const mockTransactions = [
  {
    id: "txn-1",
    type: "ORDER",
    referenceId: "order-1",
    buyerType: "USER",
    email: "alice@test.com",
    customerName: "Alice Wong",
    description: "Pikachu, Charizard",
    amount: 150,
    status: "PAID",
    remark: null,
    receiptData: {
      type: "ORDER",
      orderId: "order-1",
      email: "alice@test.com",
      items: [{ name: "Pikachu", condition: "NM", quantity: 2, unitPrice: 50 }],
      totalAmount: 100,
      date: "2026-01-15T10:00:00.000Z",
    },
    createdAt: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "txn-2",
    type: "TOURNAMENT",
    referenceId: "reg-1",
    buyerType: "GUEST",
    email: "guest@test.com",
    customerName: "Guest Player",
    description: "Sunday Cup",
    amount: 50,
    status: "PENDING",
    remark: null,
    receiptData: null,
    createdAt: "2026-02-01T08:00:00.000Z",
  },
];

test.describe("Transaction Management Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Set valid admin auth cookie (bypasses middleware redirect)
    await setAdminAuth(page);

    // Mock client-side session provider (used by AuthSessionProvider)
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

    // Mock transactions GET
    await page.route("**/api/admin/transactions*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transactions: mockTransactions,
          total: 2,
          page: 1,
          totalPages: 1,
        }),
      }),
    );
  });

  test("dashboard loads and displays transactions", async ({ page }) => {
    await page.goto("/admin/transactions");

    // Wait for data to load (debounced 300ms + network)
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Guest Player")).toBeVisible();
    await expect(page.getByText("Pikachu, Charizard")).toBeVisible();
    await expect(page.getByText("Sunday Cup")).toBeVisible();
  });

  test("search filters results", async ({ page }) => {
    // Override with filtered mock for search=alice
    await page.route("**/api/admin/transactions*", (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("search") === "alice") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            transactions: [mockTransactions[0]],
            total: 1,
            page: 1,
            totalPages: 1,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            transactions: mockTransactions,
            total: 2,
            page: 1,
            totalPages: 1,
          }),
        });
      }
    });

    await page.goto("/admin/transactions");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Guest Player")).toBeVisible();

    // Search for alice
    await page.getByPlaceholder("搜尋電郵、名稱、描述…").fill("alice");

    // Wait for debounce (300ms) + reload
    await expect(page.getByText("Alice Wong")).toBeVisible();
    await expect(page.getByText("Guest Player")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("type filter dropdown exists and is selectable", async ({ page }) => {
    await page.goto("/admin/transactions");

    // The first combobox is the type filter — should default to "" (全部類型)
    const typeSelect = page.getByRole("combobox").first();
    await expect(typeSelect).toBeVisible({ timeout: 10000 });
    await expect(typeSelect).toHaveValue("");

    // Select ORDER filter
    await typeSelect.selectOption("ORDER");
    await expect(typeSelect).toHaveValue("ORDER");
  });

  test("receipt button is visible for transactions with receiptData", async ({
    page,
  }) => {
    await page.goto("/admin/transactions");

    // Wait for Alice's row to appear
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });

    // Alice's transaction has receiptData — should have print button
    const aliceRow = page.locator("tr").filter({ hasText: "Alice Wong" });
    await expect(aliceRow.getByTitle("查看收據")).toBeVisible();
    await expect(aliceRow.getByTitle("重發收據")).toBeVisible();

    // Guest's transaction has no receiptData — no print/send buttons
    const guestRow = page.locator("tr").filter({ hasText: "Guest Player" });
    await expect(guestRow.getByTitle("查看收據")).not.toBeVisible();
  });

  test("status dropdown shows correct options per type", async ({ page }) => {
    await page.goto("/admin/transactions");

    // ORDER row should have PAID selected
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });
    const orderRow = page.locator("tr").filter({ hasText: "Alice Wong" });
    const orderSelect = orderRow.getByRole("combobox");
    await expect(orderSelect.last()).toHaveValue("PAID");

    // TOURNAMENT row should NOT have SHIPPED option
    const tournRow = page.locator("tr").filter({ hasText: "Guest Player" });
    const tournSelect = tournRow.getByRole("combobox");
    const options = await tournSelect.last().locator("option").allTextContents();
    expect(options).not.toContain("已發貨");
  });
});
