import { test, expect } from "@playwright/test";
import { setAdminAuth } from "./auth-helpers";

/**
 * E2E smoke test: Admin Accounts Dashboard (ADR-008)
 *
 * All API calls are mocked — no real database needed.
 * The email-change state machine itself is covered by the
 * unit suite (src/lib/__tests__/accounts.test.ts); this spec
 * stays on the dashboard happy path.
 */

const alice = {
  id: "acc-1",
  email: "alice@test.com",
  name: "Alice Wong",
  phone: "98765432",
  role: "USER",
  deletedAt: null,
  createdAt: "2026-01-10T08:00:00.000Z",
  pendingEmailChange: false,
};

const bob = {
  id: "acc-2",
  email: "bob@test.com",
  name: "Bob Chan",
  phone: null,
  role: "USER",
  deletedAt: null,
  createdAt: "2026-02-01T08:00:00.000Z",
  pendingEmailChange: true,
};

const carol = {
  id: "acc-3",
  email: "carol@test.com",
  name: "Carol Lee",
  phone: null,
  role: "USER",
  deletedAt: "2026-03-01T08:00:00.000Z",
  createdAt: "2025-12-01T08:00:00.000Z",
  pendingEmailChange: false,
};

test.describe("Admin Accounts Dashboard", () => {
  // 模擬後端狀態：initiate POST 後 alice 進入 pending（真後端會持久化）
  let alicePending = false;

  test.beforeEach(async ({ page }) => {
    alicePending = false;
    await setAdminAuth(page);

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

    // Default list: deleted accounts hidden (server-side filtering mocked)
    await page.route("**/api/admin/accounts?**", (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get("q") ?? "";
      const includeDeleted =
        url.searchParams.get("includeDeleted") === "true";
      const aliceNow = { ...alice, pendingEmailChange: alicePending };

      if (q === "acc-1") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([aliceNow]),
        });
      }
      if (q === "acc-2") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ ...bob, pendingEmailChange: false }]),
        });
      }
      if (q === "alice") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([aliceNow]),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          includeDeleted ? [aliceNow, bob, carol] : [aliceNow, bob],
        ),
      });
    });
  });

  test("renders accounts with pending badge; deleted hidden by default", async ({
    page,
  }) => {
    await page.goto("/admin/accounts");

    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bob Chan")).toBeVisible();
    // Pending email change badge on Bob's row
    const bobRow = page.locator("tr").filter({ hasText: "Bob Chan" });
    await expect(bobRow.getByText("電郵待驗證")).toBeVisible();
    // Carol is soft-deleted → hidden by default
    await expect(page.getByText("Carol Lee")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("search filters rows", async ({ page }) => {
    await page.goto("/admin/accounts");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("搜尋 ID、名稱、電郵、電話…").fill("alice");

    await expect(page.getByText("Bob Chan")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Alice Wong")).toBeVisible();
  });

  test("includeDeleted filter reveals deleted account with restore action", async ({
    page,
  }) => {
    await page.goto("/admin/accounts");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });

    await page.getByText("顯示已刪除").click();

    const carolRow = page.locator("tr").filter({ hasText: "Carol Lee" });
    await expect(carolRow).toBeVisible({ timeout: 10000 });
    await expect(carolRow.getByText("已刪除")).toBeVisible();
    await expect(carolRow.getByTitle("還原帳戶")).toBeVisible();
  });

  test("sort toggle and CSV export button states", async ({ page }) => {
    await page.goto("/admin/accounts");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });

    // Sort toggle
    const sortButton = page.getByRole("button", { name: /最新加入/ });
    await expect(sortButton).toBeVisible();
    await sortButton.click();
    await expect(
      page.getByRole("button", { name: /最早加入/ }),
    ).toBeVisible();

    // CSV disabled with no selection
    const csvButton = page.getByRole("button", { name: /匯出 CSV/ });
    await expect(csvButton).toBeDisabled();

    // Select Alice's row checkbox → CSV enabled
    const aliceRow = page.locator("tr").filter({ hasText: "Alice Wong" });
    await aliceRow.getByRole("checkbox").check();
    await expect(csvButton).toBeEnabled();
  });

  test("edit window: initiate email change reflects pending state", async ({
    page,
  }) => {
    // Mock initiate POST — flips alice to pending (stateful)
    await page.route("**/api/admin/accounts/acc-1/email-change", (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      alicePending = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "電郵變更已啟動" }),
      });
    });

    await page.goto("/admin/accounts");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });

    // Open edit window
    const aliceRow = page.locator("tr").filter({ hasText: "Alice Wong" });
    await aliceRow.getByTitle("詳細 / 編輯").click();
    await expect(page.getByText("帳戶詳細")).toBeVisible();

    // Fill new email and initiate
    await page.locator("#new-email").fill("alice-new@test.com");
    await page.getByRole("button", { name: /確認變更電郵/ }).click();

    // Success message, and refreshed row shows pending badge
    await expect(page.getByText("電郵變更已啟動")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTitle("關閉").click(); // close (X)
    await expect(aliceRow.getByText("電郵待驗證")).toBeVisible({
      timeout: 10000,
    });
  });

  test("edit window: reverse button shown for pending change", async ({
    page,
  }) => {
    // Mock reverse POST
    await page.route("**/api/admin/accounts/acc-2/email-change/reverse", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "已還原電郵變更" }),
      }),
    );

    await page.goto("/admin/accounts");
    await expect(page.getByText("Bob Chan")).toBeVisible({ timeout: 10000 });

    const bobRow = page.locator("tr").filter({ hasText: "Bob Chan" });
    await bobRow.getByTitle("詳細 / 編輯").click();
    await expect(page.getByText("帳戶詳細")).toBeVisible();

    // Pending state shows the reverse affordance
    await expect(
      page.getByRole("button", { name: /還原電郵變更/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: /還原電郵變更/ }).click();
    await expect(page.getByText("已還原電郵變更")).toBeVisible({
      timeout: 10000,
    });
  });

  test("transactions link carries email query param", async ({ page }) => {
    await page.goto("/admin/accounts");
    await expect(page.getByText("Alice Wong")).toBeVisible({ timeout: 10000 });

    const aliceRow = page.locator("tr").filter({ hasText: "Alice Wong" });
    const link = aliceRow.getByTitle("查看交易紀錄");
    await expect(link).toHaveAttribute(
      "href",
      "/admin/transactions?email=alice%40test.com",
    );
  });
});
