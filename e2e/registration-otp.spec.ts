import { test, expect } from "@playwright/test";

/**
 * E2E smoke test: Registration with OTP gate.
 *
 * API calls are mocked — no database or Resend needed.
 * Tests the full UI flow: form → OTP step → verification → redirect.
 */

test.describe("Registration OTP flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock send-registration-otp → success
    await page.route("**/api/auth/send-registration-otp", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );
  });

  test("shows OTP step after submitting registration form", async ({ page }) => {
    await page.goto("/login");

    // Switch to register tab
    await page.getByRole("button", { name: "註冊", exact: true }).click();

    // Fill registration form
    await page.getByLabel("電郵").fill("newuser@example.com");
    await page.getByLabel("密碼").fill("securepass123");
    await page.getByLabel("名稱（選填）").fill("Test User");

    // Submit
    await page.getByRole("button", { name: "發送驗證碼" }).click();

    // Verify OTP step appears
    await expect(page.getByText("驗證碼已發送至")).toBeVisible();
    await expect(
      page.getByText("newuser@example.com"),
    ).toBeVisible();
    await expect(
      page.getByText("請輸入 6 位數驗證碼"),
    ).toBeVisible();
  });

  test("can return to form from OTP step", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "註冊", exact: true }).click();
    await page.getByLabel("電郵").fill("newuser@example.com");
    await page.getByLabel("密碼").fill("securepass123");
    await page.getByRole("button", { name: "發送驗證碼" }).click();

    // Click "返回修改"
    await page.getByRole("button", { name: "返回修改" }).click();

    // Should be back on the registration form
    await expect(page.getByLabel("電郵")).toBeVisible();
    await expect(page.getByLabel("密碼")).toBeVisible();
  });

  test("verify button is disabled until 6 digits entered", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "註冊", exact: true }).click();
    await page.getByLabel("電郵").fill("newuser@example.com");
    await page.getByLabel("密碼").fill("securepass123");
    await page.getByRole("button", { name: "發送驗證碼" }).click();

    // Verify button should be disabled initially
    const verifyButton = page.getByRole("button", { name: "驗證" });
    await expect(verifyButton).toBeDisabled();

    // Type 6 digits in OTP inputs
    const otpInputs = page.locator('input[maxlength="1"]');
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(String(i + 1));
    }

    // Now verify button should be enabled
    await expect(verifyButton).toBeEnabled();
  });

  test("successful verification redirects away from login", async ({ page }) => {
    // Mock verify-registration → success (user created)
    await page.route("**/api/auth/verify-registration", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "1", email: "newuser@example.com" },
        }),
      }),
    );

    // Mock NextAuth credentials callback → success
    await page.route("**/api/auth/callback/credentials*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "http://localhost:3000/", ok: true }),
      }),
    );

    // Mock getSession → returns admin/user session
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { role: "USER", email: "newuser@example.com" },
        }),
      }),
    );

    await page.goto("/login");
    await page.getByRole("button", { name: "註冊", exact: true }).click();
    await page.getByLabel("電郵").fill("newuser@example.com");
    await page.getByLabel("密碼").fill("securepass123");
    await page.getByRole("button", { name: "發送驗證碼" }).click();

    // Type OTP
    const otpInputs = page.locator('input[maxlength="1"]');
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill("1");
    }

    // Click verify
    await page.getByRole("button", { name: "驗證" }).click();

    // Should navigate away from /login (to homepage or admin)
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10000,
    });
  });

  test("shows forgot password link on login tab", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("忘記密碼？")).toBeVisible();
  });

  test("forgot password link navigates to forgot-password page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByText("忘記密碼？").click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(
      page.getByRole("heading", { name: "忘記密碼" }),
    ).toBeVisible();
  });
});
