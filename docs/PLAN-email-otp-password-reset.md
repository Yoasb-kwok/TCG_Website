# Implementation Plan: Email OTP Registration & Password Reset

| Field | Value |
|-------|-------|
| **Related ADR** | ADR-002 |
| **Status** | Ready for implementation |
| **Prerequisite** | Supervisor approval (same as WhatsApp plan) |

---

## ⚠️ Prerequisites (Must Be Done First)

The project currently has **no test framework installed**. The mandatory rules below require Vitest and Playwright. Before starting any sub-task:

```bash
npm install -D vitest @vitejs/plugin-react jsdom @playwright/test
```

Add to `package.json` scripts:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "type-check": "tsc --noEmit"
}
```

Create `vitest.config.ts` and `playwright.config.ts`.

**This setup is Sub-task 0.**

---

## Mandatory Actions BEFORE Writing Feature Code

These rules apply to **every sub-task** in this plan.

### 1. Write Failing Tests First (TDD)
- Write unit/integration tests (Vitest) that precisely describe the expected behavior of the new feature.
- These tests **must fail** initially (red).
- Write the minimum code to make them pass (green).
- Then refactor.

### 2. Create Rollback Scripts
- If the sub-task involves database schema changes (Prisma migrations), generate the **"down" migration** (rollback script) *before* writing the feature logic.
- Prisma doesn't have native down migrations — create a manual `prisma/migrations/rollback/` SQL script that reverses each change.

### 3. Enforce Static Checks
- `npm run lint`, `npm run type-check`, and `npm run test` must pass after every file save.
- Print terminal output as proof. Do not assume they pass.

---

## HARD RULES FOR THE IMPLEMENTING AGENT

1. **SPEC LOCK**: You cannot change this plan or the ADR-002 requirements. If you hit a blocker, PAUSE and ask the user. Do not improvise.
2. **ATOMIC COMMITS**: You are restricted to editing a maximum of **3 files per sub-task**. Break larger tasks down.
3. **TOOL USE MANDATE**: You MUST run `npm run lint`, `npm run type-check`, and the relevant tests after EVERY file save. You must print the terminal result as proof. Do not assume they pass.
4. **CIRCUIT BREAKER**: If a test fails 3 times in a row on the same sub-task, STOP immediately. Do not attempt a 4th fix. Log the error and wait for the user.
5. **CONTEXT REFRESH**: Before starting sub-task #4, #7, and #10, re-read ADR-002 and this plan. Summarize your progress to ensure you haven't drifted from the goal.
6. **INTEGRATION FIRST**: Prioritize writing 1 end-to-end (E2E) smoke test (Playwright) for the main user flow. If the E2E passes, the core logic is solid.

---

## Sub-Task Breakdown

Each sub-task follows the TDD cycle: **Red → Green → Refactor**.

### Sub-task 0: Test Infrastructure Setup

| Item | Detail |
|------|--------|
| **Files** | `vitest.config.ts`, `playwright.config.ts`, `package.json` (scripts only) |
| **Test** | Write a trivial test (`1 + 1 = 2`) to confirm Vitest runs |
| **Verify** | `npm run test` passes, `npm run lint` passes, `npm run type-check` passes |

### Sub-task 1: Prisma Schema — EmailVerification + PasswordReset

| Item | Detail |
|------|--------|
| **Files** | `prisma/schema.prisma`, `prisma/migrations/XXXXXX_email_otp_reset/migration.sql`, `prisma/migrations/XXXXXX_email_otp_reset/rollback.sql` |
| **TDD** | Test that Prisma client can `create`, `findUnique`, `delete` on both new models |
| **Rollback** | `rollback.sql` drops both tables |
| **Verify** | `npx prisma migrate dev` succeeds, tests pass |

**Schema (from ADR-002):**

```prisma
model EmailVerification {
  id           String   @id @default(uuid())
  email        String   @unique
  code         String
  passwordHash String
  name         String?
  phone        String?
  attempts     Int      @default(0)
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  @@index([email, expiresAt])
}

model PasswordReset {
  id        String   @id @default(uuid())
  email     String   @unique
  code      String
  attempts  Int      @default(0)
  used      Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())
  @@index([email, expiresAt])
}
```

### Sub-task 2: OTP Utility Library

| Item | Detail |
|------|--------|
| **Files** | `src/lib/otp.ts`, `src/lib/otp.test.ts` |
| **TDD** | Tests first: `generateOtp()` returns 6-digit string, `hashOtp()` + `verifyOtp()` round-trip, `isExpired()` logic |
| **Implementation** | `crypto.randomInt(100000, 1000000)`, bcrypt hash/verify, expiry check |
| **Verify** | Tests pass, lint passes, type-check passes |

```typescript
// src/lib/otp.ts — function signatures
generateOtp(): string                           // "483729"
hashOtp(code: string): Promise<string>          // bcrypt hash
verifyOtp(code: string, hash: string): Promise<boolean>
isExpired(expiresAt: Date): boolean
```

### Sub-task 3: Rate Limiting Utility

| Item | Detail |
|------|--------|
| **Files** | `src/lib/rate-limit.ts`, `src/lib/rate-limit.test.ts` |
| **TDD** | Tests first: per-key cooldown (60s), per-IP limit (5 per 10 min), expiry of old entries |
| **Implementation** | In-memory `Map<string, { count, firstAttempt, lastAttempt }>` with TTL cleanup |
| **Verify** | Tests pass, lint passes, type-check passes |

```typescript
// src/lib/rate-limit.ts — function signatures
checkRateLimit(key: string, opts: { max: number, windowMs: number }): { allowed: boolean, retryAfterMs: number }
checkCooldown(key: string, opts: { cooldownMs: number }): { allowed: boolean, retryAfterMs: number }
```

### Sub-task 4: Registration OTP Email Template

> **🔄 CONTEXT REFRESH** — Re-read ADR-002. Summarize progress so far. Confirm you're on track.

| Item | Detail |
|------|--------|
| **Files** | `src/emails/otp-verification.tsx` |
| **TDD** | No unit test needed (presentational). Verify via E2E in sub-task 11. |
| **Implementation** | React Email component showing 6-digit code, TCGHK branding, "10分鐘內有效" notice |
| **Verify** | Type-check passes, lint passes |

### Sub-task 5: Registration OTP Send Endpoint

| Item | Detail |
|------|--------|
| **Files** | `src/app/api/auth/send-registration-otp/route.ts`, `src/app/api/auth/send-registration-otp/route.test.ts` |
| **TDD** | Tests first: returns 200 + creates EmailVerification row, rejects already-registered email, rate-limits on repeat, validates email format |
| **Implementation** | Validate input → check email not taken → rate-limit → generate + hash OTP → upsert EmailVerification → send email |
| **Verify** | Tests pass, lint passes, type-check passes |

### Sub-task 6: Registration OTP Verify Endpoint

| Item | Detail |
|------|--------|
| **Files** | `src/app/api/auth/verify-registration/route.ts`, `src/app/api/auth/verify-registration/route.test.ts` |
| **TDD** | Tests first: correct code → creates User + deletes row, wrong code → increments attempts, 5 wrong attempts → invalidates code, expired code → rejected |
| **Implementation** | Find row → check expiry → increment attempts → verify code → create User → delete row |
| **Note** | Auto-login via `signIn("credentials")` after account creation — test this in integration |
| **Verify** | Tests pass, lint passes, type-check passes |

### Sub-task 7: Password Reset Email Template

> **🔄 CONTEXT REFRESH** — Re-read ADR-002. Summarize progress. Confirm you're on track.

| Item | Detail |
|------|--------|
| **Files** | `src/emails/password-reset-otp.tsx` |
| **TDD** | No unit test (presentational). |
| **Implementation** | React Email component showing 6-digit code, "重設密碼驗證碼" |
| **Verify** | Type-check passes, lint passes |

### Sub-task 8: Forgot Password Send Endpoint

| Item | Detail |
|------|--------|
| **Files** | `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/forgot-password/route.test.ts` |
| **TDD** | Tests first: registered email → 200 + creates PasswordReset row + sends email, unregistered email → 200 (silent no-op, no email sent), rate-limited on repeat |
| **Implementation** | Validate email → check User exists → rate-limit → generate + hash OTP → upsert PasswordReset → send email (only if User exists) |
| **Verify** | Tests pass, lint passes, type-check passes |

### Sub-task 9: Password Reset Verify + JWT + Reset Endpoints

| Item | Detail |
|------|--------|
| **Files** | `src/app/api/auth/verify-reset-otp/route.ts`, `src/app/api/auth/reset-password/route.ts` |
| **TDD** | Tests for verify: correct code → returns JWT, wrong code → increments attempts, expired → rejected. Tests for reset: valid JWT → updates password, invalid JWT → 401, expired JWT → 401 |
| **Implementation** | Verify endpoint: check code → issue 5-min JWT `{ email, purpose: "password_reset", exp }`. Reset endpoint: verify JWT → validate new password → update User.passwordHash → mark PasswordReset as used |
| **Note** | This sub-task touches 2 route files + 1 test file. Max 3 files — OK. |
| **Verify** | Tests pass, lint passes, type-check passes |

### Sub-task 10: UI — Registration OTP Flow

> **🔄 CONTEXT REFRESH** — Re-read ADR-002. Summarize progress. Confirm you're on track.

| Item | Detail |
|------|--------|
| **Files** | `src/components/auth/auth-form.tsx`, `src/components/auth/otp-input.tsx` |
| **TDD** | No unit test (UI). Verified via E2E in sub-task 11. |
| **Implementation** | Modify registration flow: form submit → call send-registration-otp → show OTP input → verify → auto-login redirect. Add "忘記密碼？" link to login tab. |
| **Verify** | Type-check passes, lint passes |

### Sub-task 11: UI — Forgot Password + Reset Password Pages

| Item | Detail |
|------|--------|
| **Files** | `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx` |
| **TDD** | No unit test (UI). Verified via E2E in sub-task 12. |
| **Implementation** | Forgot password: email entry → OTP entry → redirect to reset page with JWT. Reset password: new password + confirm + 5-min countdown timer. |
| **Verify** | Type-check passes, lint passes |

### Sub-task 12: E2E Smoke Tests

| Item | Detail |
|------|--------|
| **Files** | `e2e/registration-otp.spec.ts`, `e2e/password-reset.spec.ts` |
| **TDD** | Write E2E tests for the two main flows: (1) register with OTP → verify → auto-login → see homepage, (2) forgot password → OTP → reset → login with new password |
| **Implementation** | Mock email API calls in test env via `page.route()`. Test the full user flow in the browser. |
| **Verify** | `npm run test:e2e` passes |

### Sub-task 13: Email Provider — Brevo (Superseded by Sub-task 14)

| Item | Detail |
|------|--------|
| **Files** | `src/lib/email.ts` (rewrite), `docs/PLAN-email-otp-password-reset.md` |
| **Reason** | Resend free tier requires a verified custom domain. Brevo free tier allows sending from a verified sender email. |
| **Status** | ⚠️ Superseded by Sub-task 14 — Brevo requires domain authentication due to DMARC policies on Gmail/Yahoo. Cannot send from individual email addresses without owning the domain. |

### Sub-task 14: Switch Email Provider to Gmail SMTP (Nodemailer)

| Item | Detail |
|------|--------|
| **Files** | `src/lib/email.ts` (rewrite), `.env`, `docs/PLAN-email-otp-password-reset.md` |
| **Reason** | Both Resend and Brevo require domain authentication (DMARC policy enforcement). Gmail SMTP bypasses DMARC because emails are sent through Google's own servers. No custom domain needed. Free (500 emails/day). |
| **Changes** | Replaced Brevo REST API with `nodemailer` SMTP transport (`service: "gmail"`). React Email templates rendered to HTML via `@react-email/render` then sent via `transporter.sendMail()`. All function signatures unchanged. Added `nodemailer` + `@types/nodemailer` dependencies. |
| **Env vars** | `BREVO_API_KEY` / `BREVO_FROM_EMAIL` → `SMTP_USER` (Gmail address) + `SMTP_APP_PASSWORD` (Gmail App Password, requires 2FA enabled) |
| **Verify** | Type-check passes, lint passes, 51 unit tests pass |
| **Status** | ✅ Code complete — awaiting Gmail App Password in `.env` |

---

## File Impact Summary

| Category | Files |
|----------|-------|
| **New — Infra** | `vitest.config.ts`, `playwright.config.ts` |
| **New — DB** | Prisma migration (up + rollback SQL) |
| **New — Lib** | `src/lib/otp.ts`, `src/lib/rate-limit.ts` |
| **New — Email** | `src/emails/otp-verification.tsx`, `src/emails/password-reset-otp.tsx` |
| **New — API** | 5 route files (send-registration-otp, verify-registration, forgot-password, verify-reset-otp, reset-password) |
| **New — UI** | `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`, `src/components/auth/otp-input.tsx` |
| **Modified** | `prisma/schema.prisma`, `src/components/auth/auth-form.tsx`, `src/lib/email.ts` (Resend → Brevo → Gmail SMTP), `package.json` |
| **New — Tests** | Unit tests for otp.ts, rate-limit.ts, all 5 API routes. E2E tests for 2 flows. |

---

## Environment Variables Needed

```env
# Gmail SMTP (email service — see Sub-task 14)
SMTP_USER=                          # Gmail address (e.g. your-shop@gmail.com)
SMTP_APP_PASSWORD=                  # Gmail App Password (requires 2FA enabled on the account)

# JWT for password reset (can reuse existing)
AUTH_SECRET=                       # Already used by NextAuth
```

---

## Cleanup Strategy for Expired Rows

Both `EmailVerification` and `PasswordReset` tables will accumulate expired rows. Two approaches:

1. **Lazy cleanup** (recommended for now) — delete expired rows when a new OTP is requested for the same email (during the upsert).
2. **Scheduled cleanup** (future) — add a cron job or Vercel scheduled function to delete rows where `expiresAt < now()`.

The lazy approach is sufficient for a small shop. No additional infrastructure needed.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SMTP service downtime blocks registration | Low | High | Show friendly error; user can retry. Gmail SMTP is highly reliable (Google infrastructure). |
| Rate limiter resets on server restart | Medium | Low | Acceptable for single-instance; upgrade to Redis later |
| User mistypes email during registration | Medium | Medium | OTP goes to wrong inbox; account never created; row expires in 10 min |
| OTP email goes to spam | Medium | Medium | Email template includes shop name + clear subject line |
| Brute-force on verify endpoint | Low | High | Attempt counter (5 max) + time-window rate limiting |
