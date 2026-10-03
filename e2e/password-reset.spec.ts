import { test, expect } from "@playwright/test";

/**
 * E2E smoke test: Password reset with OTP + short-lived JWT.
 *
 * API calls are mocked — no database or Resend needed.
 * Tests the full UI flow: forgot-password → OTP → reset-password → login redirect.
 */

test.describe("Password reset flow", () => {
  test("email entry → OTP step transition", async ({ page }) => {
    // Mock forgot-password → success (anti-enumeration: always 200)
    await page.route("**/api/auth/forgot-password", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );

    await page.goto("/forgot-password");

    // Fill email
    await page.getByLabel("電郵").fill("user@example.com");
    await page.getByRole("button", { name: "發送驗證碼" }).click();

    // Verify OTP step appears
    await expect(page.getByText("驗證碼已發送至")).toBeVisible();
    await expect(page.getByText("user@example.com")).toBeVisible();
    await expect(
      page.getByText("請輸入 6 位數驗證碼"),
    ).toBeVisible();
  });

  test("OTP verification redirects to reset-password page", async ({ page }) => {
    // Mock forgot-password
    await page.route("**/api/auth/forgot-password", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );

    // Mock verify-reset-otp → returns JWT token
    await page.route("**/api/auth/verify-reset-otp", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "mock-jwt-token", expiresIn: 300 }),
      }),
    );

    await page.goto("/forgot-password");
    await page.getByLabel("電郵").fill("user@example.com");
    await page.getByRole("button", { name: "發送驗證碼" }).click();

    // Type OTP
    const otpInputs = page.locator('input[maxlength="1"]');
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill("1");
    }

    // Click verify
    await page.getByRole("button", { name: "驗證" }).click();

    // Should redirect to /reset-password with token
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    await expect(
      page.getByRole("heading", { name: "設定新密碼" }),
    ).toBeVisible();
  });

  test("reset-password page shows countdown timer", async ({ page }) => {
    // Navigate directly with a mock token
    await page.goto("/reset-password?token=mock-jwt-token");

    // Countdown should be visible
    await expect(page.getByText("剩餘時間：")).toBeVisible();
    // Initial value should be 5:00
    await expect(page.getByText("5:00")).toBeVisible();

    // Password fields should be visible
    await expect(page.getByLabel("新密碼")).toBeVisible();
    await expect(page.getByLabel("確認密碼")).toBeVisible();
  });

  test("reset-password without token shows error", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(
      page.getByRole("heading", { name: "連結無效" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "重新申請 →" }),
    ).toBeVisible();
  });

  test("password mismatch shows error on reset page", async ({ page }) => {
    await page.goto("/reset-password?token=mock-jwt-token");

    await page.getByLabel("新密碼").fill("newpass123");
    await page.getByLabel("確認密碼").fill("different123");
    await page.getByRole("button", { name: "重設密碼" }).click();

    await expect(page.getByText("兩次輸入的密碼不一致")).toBeVisible();
  });

  test("successful reset redirects to login", async ({ page }) => {
    // Mock reset-password → success
    await page.route("**/api/auth/reset-password", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "密碼已重設，請使用新密碼登入" }),
      }),
    );

    await page.goto("/reset-password?token=mock-jwt-token");
    await page.getByLabel("新密碼").fill("newpass123");
    await page.getByLabel("確認密碼").fill("newpass123");
    await page.getByRole("button", { name: "重設密碼" }).click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
