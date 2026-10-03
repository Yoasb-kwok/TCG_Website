# ADR-002: Email OTP Registration & Password Reset

| Field | Value |
|-------|-------|
| **Status** | Proposed |
| **Date** | 2026-08-11 |
| **Decision Maker** | Project owner (via grilling session) |
| **Supersedes** | — |
| **Depends on** | ADR-001 (Resend email infrastructure), NextAuth v5 |

---

## Context

The current authentication system uses NextAuth v5 with a Credentials provider (email + password + bcrypt). Registration creates the account immediately with no email verification, and there is no password reset flow. Users can register with any email — real or fake — and instantly access the system.

The project owner wants to add:

1. **Registration verification with OTP** — a 6-digit code emailed to the user. The account is only created after the code is verified.
2. **Forgot password with OTP** — a 6-digit code emailed to verify identity, followed by a password reset step.
3. **Receipt to mail** — already built in ADR-001 (`sendOrderReceipt()` via Resend, wired into the Stripe webhook). Only requires `RESEND_API_KEY` in `.env`.

### Current State of the Codebase

- **Auth**: NextAuth v5, Credentials provider, JWT sessions. `src/auth.ts`, `src/auth.config.ts`.
- **Registration**: `POST /api/auth/register` creates the User immediately and the client auto-logs in via `signIn("credentials")`. No verification step.
- **Password reset**: Does not exist. No "forgot password" link on the login form.
- **Receipt email**: Already built — `sendOrderReceipt()` in `src/lib/email.ts`, wired into `src/app/api/webhooks/stripe/route.ts`.
- **User model**: `id, email, name, phone, passwordHash, role, createdAt, updatedAt`. No `emailVerified` field.
- **Resend**: Installed (`resend@^6.18.1`). Email templates exist in `src/emails/`.

---

## Decision 1: Registration with OTP Gate

### Summary

The user fills in the registration form (email, password, name, phone) → an OTP code is emailed → the user enters the code → the account is created and the user is auto-logged in.

The account does **not** exist until the OTP is verified. OTP is a **gate**, not a flag.

### Flow

```
Registration Form (email, password, name, phone)
  │
  ▼
POST /api/auth/send-registration-otp
  ├── Validate input (email format, password strength, email not already registered)
  ├── Rate-limit check (per-email 60s cooldown + per-IP 5 per 10 min)
  ├── Hash password, generate 6-digit OTP (crypto.randomInt)
  ├── Upsert EmailVerification row { email, code, passwordHash, name, phone, expiresAt: +10min, attempts: 0 }
  └── Send OTP email via Resend
  │
  ▼
OTP Entry Page
  │
  ▼
POST /api/auth/verify-registration
  ├── Rate-limit check (time-window)
  ├── Increment attempts on EmailVerification row
  ├── Reject if attempts ≥ 5 (silent kill) or code mismatch
  ├── Check code matches and not expired
  ├── Create User from EmailVerification data
  ├── Delete EmailVerification row
  └── Auto-login via signIn("credentials")
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OTP storage | Database table (`EmailVerification`) | Account doesn't exist yet; need to persist registration data across the email round-trip |
| Account creation | Gated — only after OTP verified | Prevents fake/spam accounts; ensures email is valid |
| Post-verification | Auto-login | User just proved email ownership; no need to re-enter credentials |
| OTP expiry | 10 minutes | Enough time to check email; short enough to limit attack window |
| Max attempts | 5 | Balances UX (typos) with security (brute-force prevention) |

### Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| **Signed JWT instead of DB table** | JWT can't be revoked; harder to implement attempt counting and expiry cleanup |
| **Account created immediately (unverified)** | Creates "zombie" accounts for emails that never verify; complicates login logic |
| **Magic link instead of OTP** | OTP is simpler UX on mobile (no link tapping); user requested OTP specifically |
| **Email verification as a flag (not a gate)** | Project owner explicitly chose gate — account must not exist until verified |

---

## Decision 2: Forgot Password with OTP + Short-Lived JWT

### Summary

The user enters their email → an OTP code is emailed → the user enters the code → a 5-minute JWT is issued → the user is redirected to a "set new password" page → the user sets a new password.

### Flow

```
Forgot Password Page (enter email)
  │
  ▼
POST /api/auth/forgot-password
  ├── Check User exists for email (silent no-op if not — don't reveal)
  ├── Rate-limit check (per-email 60s cooldown + per-IP 5 per 10 min)
  ├── Generate 6-digit OTP, upsert PasswordReset row { email, code, expiresAt: +10min, attempts: 0 }
  └── Send OTP email via Resend
  │
  ▼
OTP Entry Page
  │
  ▼
POST /api/auth/verify-reset-otp
  ├── Rate-limit check (time-window)
  ├── Increment attempts, reject if ≥ 5
  ├── Check code matches and not expired
  ├── Issue short-lived JWT { email, purpose: "password_reset", exp: +5min }
  └── Return JWT to client (stored in cookie or memory)
  │
  ▼
Set New Password Page (with 5-min countdown shown to user)
  │
  ▼
POST /api/auth/reset-password
  ├── Verify JWT (valid + not expired + purpose matches)
  ├── Validate new password strength
  ├── Update User.passwordHash
  ├── Mark PasswordReset row as used
  └── Redirect to /login
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Separate table | `PasswordReset` (not shared with `EmailVerification`) | Different data shape; registration stores passwordHash/name/phone, reset doesn't |
| Post-OTP flow | Two-step: verify OTP → 5-min JWT → password page | Cleanest separation of concerns; user sees countdown |
| JWT expiry | 5 minutes | Short enough to be safe if intercepted; long enough to type a password |
| JWT revocation | None (stateless JWT) | 5-minute window is short enough; user notified of time limit |
| User notification | Countdown timer visible on password page | User knows the time pressure; reduces "it expired?" confusion |

### Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| **One-step form (OTP + new password together)** | Requires user to think of a new password before verifying; worse UX |
| **Longer JWT (30 min) + row-based revocation** | More complex; adds DB check on every reset attempt; marginal benefit for small shop |
| **Magic link (reset link in email)** | User requested OTP specifically; link can be harder on mobile |

---

## Database Schema Changes

### New Table: `EmailVerification`

```prisma
model EmailVerification {
  id           String   @id @default(uuid())
  email        String   @unique
  code         String                  // 6-digit OTP, hashed
  passwordHash String                  // bcrypt hash from registration form
  name         String?
  phone        String?
  attempts     Int      @default(0)
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([email, expiresAt])
}
```

### New Table: `PasswordReset`

```prisma
model PasswordReset {
  id        String   @id @default(uuid())
  email     String   @unique
  code      String                  // 6-digit OTP, hashed
  attempts  Int      @default(0)
  used      Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email, expiresAt])
}
```

### Existing `User` Model

**No changes needed.** Since OTP is a gate (account only created after verification), every existing User is grandfathered in. An `emailVerified` field is unnecessary — the existence of the account implies verification.

---

## Security Model

### OTP Code Generation

- Use `crypto.randomInt(100000, 1000000)` — **not** `Math.random()`.
- Code is **hashed** (bcrypt) before storing in the DB.
- Plain-text code is never persisted; it exists only in the email and the user's memory.

### Rate Limiting — Send Endpoint

| Layer | Rule | User-facing? |
|-------|------|-------------|
| Per-email cooldown | Max 1 OTP per email per 60 seconds | Yes — "請稍候 60 秒再試" |
| Per-IP limit | Max 5 OTP requests per IP per 10 minutes | Yes — "請求過於頻繁，請稍後再試" |

### Rate Limiting — Verify Endpoint

| Layer | Rule | User-facing? |
|-------|------|-------------|
| Attempt counter | Max 5 wrong attempts per code, then code is invalidated | Silent — generic "驗證碼無效" message |
| Time-window | Max 10 verify attempts per IP per 10 minutes | Yes — "嘗試次數過多，請稍後再試" |

### Forgot Password — Non-Disclosure

If an email is not registered, the forgot-password endpoint returns the same success response as if it were. The OTP email is simply not sent. This prevents email enumeration.

---

## New Environment Variables

```env
RESEND_API_KEY=           # Already required by ADR-001
RESEND_FROM_EMAIL=        # Already required by ADR-001
JWT_SECRET=               # Used for password-reset JWT (can reuse AUTH_SECRET)
```

---

## Implementation Points

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add `EmailVerification` and `PasswordReset` models |
| `src/lib/otp.ts` | OTP generation (`crypto.randomInt`), hashing, verification |
| `src/lib/rate-limit.ts` | Per-email and per-IP rate limiting (in-memory or DB-based) |
| `src/emails/otp-verification.tsx` | Registration OTP email template |
| `src/emails/password-reset-otp.tsx` | Password reset OTP email template |
| `src/app/api/auth/send-registration-otp/route.ts` | Registration OTP send endpoint |
| `src/app/api/auth/verify-registration/route.ts` | Registration OTP verify + account creation |
| `src/app/api/auth/forgot-password/route.ts` | Password reset OTP send endpoint |
| `src/app/api/auth/verify-reset-otp/route.ts` | Password reset OTP verify + JWT issue |
| `src/app/api/auth/reset-password/route.ts` | Password update with JWT |
| `src/app/forgot-password/page.tsx` | Forgot password UI (email entry + OTP) |
| `src/app/reset-password/page.tsx` | Set new password UI (with countdown) |
| `src/components/auth/auth-form.tsx` | Add "忘記密碼？" link, modify registration flow |

---

## Consequences

### Positive

- **Spam prevention** — fake email accounts can no longer be created.
- **Security** — password reset without admin intervention.
- **User trust** — verified email means receipts and notifications actually reach the user.
- **Clean data** — no zombie accounts for mistyped emails.

### Negative / Trade-offs

- **Registration friction** — extra step may reduce sign-up conversion.
- **Email dependency** — if Resend is down, registration is blocked. (Mitigation: graceful error message.)
- **Maintenance** — two new tables require periodic cleanup of expired rows.
- **Rate limiting** — in-memory rate limiting resets on server restart. Acceptable for a small shop; upgrade to Redis if needed later.

### Upgrade Paths

- Add OAuth (Google login) alongside credentials — NextAuth v5 supports multiple providers.
- Switch in-memory rate limiting to Redis for multi-instance deployments.
- Add phone number OTP (SMS) for 2FA.
