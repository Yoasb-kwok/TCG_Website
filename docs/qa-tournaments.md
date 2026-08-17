# Tournament Feature — Manual QA Test Suite

**Feature under test:** Tournaments (admin + user), `/admin/tournaments`, `/tournaments`, `/tournaments/[slug]/register`, payment + status lifecycle.
**Tester:** ________  **Date:** ________  **Build / commit:** ________  **Environment:** ☐ Local (demo) ☐ Staging (DB + Stripe test) ☐ Prod

## How to read each table

| Column | Meaning |
|---|---|
| **ID** | Stable reference, e.g. `A-01`. |
| **Step / Action** | What the tester does. A `→` chains sub-steps. |
| **Expected Result** | The observable, verifiable outcome. |
| **Pass/Fail** | ☐ Pass  ☐ Fail  (fill on execution). |

**Severity legend:** 🔴 Blocker · 🟠 Major · 🟡 Minor.

---

## Prerequisites / Test data

- An **admin** account (`role = ADMIN`) and a **plain user** account (`USER`).
- DB configured (so demo fallback is NOT in play) unless a case explicitly tests the demo fallback.
- For paid cases: **Stripe in test mode** with cards `4242 4242 4242 4242` (success), `4000 0027 6000 3184` (3DS), `4000 0000 0000 9995` (decline).
- Clock reference is **Asia/Hong_Kong (UTC+8)** — the code compares absolute instants, so seed `startsAt`/`durationMinutes` accordingly when a case depends on time.
- Seed tournaments for capacity tests with `maxPlayers = 2` to make "full" reachable quickly.

---

## A. Admin — Create Tournament (Happy Path)

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| A-01 | Log in as admin → open `/admin/tournaments`. | Page loads; heading "店賽報名"; "新增賽事" button visible. | ☐ |
| A-02 | Click "新增賽事". | Create form appears with defaults: 賽制=Standard, 名額=32, 報名費=80, 地點=門市, 預計時長=120. | ☐ |
| A-03 | Fill title="標準賽 7月", date=tomorrow, time field=14:30 (use dropdown), 報名截止 date=today, deadline time=23:45, prizePool="冠軍 booster box". Click "建立賽事". | Form closes; new tournament appears at top of list with correct date/location/format/duration, fee formatted as HKD. | ☐ |
| A-04 | Verify card header counts. | Shows `0 / 32 人`; fee line shows formatted HKD (e.g. `HK$80`). | ☐ |
| A-05 | Create a **free** tournament: entryFee=0. | Created; fee line shows "免費". | ☐ |
| A-06 | Create with duration picked from dropdown (e.g. 2 小時 / 120). | Stored duration correct; list shows "2 小時". | ☐ |
| A-07 | Time field — pick from 15-min dropdown (e.g. 上午 2:30 (02:30)). | Value set; warning "⚠ 此時間不在一般時段（12:00am–10:00pm）內，請確認" appears (amber). | ☐ |
| A-08 | Time field — pick 14:00 (normal hours). | No amber warning shown. | ☐ |
| A-09 | Time field — type `1430` in the HH:MM text box. | Input auto-strips to `14:30` (colon handling) and stays ≤5 chars. | ☐ |

## B. Admin — Create Tournament (Edge / Validation)

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| B-01 | Submit form with **title empty** (HTML `required`). | Browser blocks submit; native required validation on title. | ☐ |
| B-02 | Submit with **比賽日期 empty** (required date). | Browser blocks submit. | ☐ |
| B-03 | Submit with **比賽時間 empty** (TimeField text input is `required`). | Browser blocks submit (text input required). | ☐ |
| B-04 | Set 比賽時間 text to `25:99` (invalid). | Inline red error "時間格式不正確，請輸入 HH:MM（00:00–23:45）"; submit shows alert "請輸入正確的時間格式…". 🟡 | ☐ |
| B-05 | Set deadline **after** start time (e.g. start today 10:00, deadline tomorrow). | **⚠ Expected gap:** no validation prevents this. Tournament is created with an illogical deadline. (See notes — log as a defect.) 🟠 | ☐ |
| B-06 | Set entryFee to **0** and maxPlayers to **1**. | Created; behaves as a free, single-slot tournament. | ☐ |
| B-07 | Set entryFee to **negative** (e.g. -50) by editing the number input. | **⚠ Expected gap:** no min validation. Created with negative fee. Log as defect. 🟠 | ☐ |
| B-08 | Set maxPlayers to **0** or **negative**. | **⚠ Expected gap:** no min validation. Created. Capacity logic then blocks all registrations (0) or accepts unlimited if negative. Log as defect. 🟠 | ☐ |
| B-09 | Title with special/CJK chars + emoji, e.g. "七月賽 🏆 標準". | Created; slug derived tolerates CJK; card renders title correctly. | ☐ |
| B-10 | Direct API: `POST /api/admin/tournaments` with body missing `title`. | Prisma create throws → **500** with no friendly message (uncaught). Log as defect. 🔴/🟠 | ☐ |
| B-11 | Direct API: `POST` with `maxPlayers: "abc"` (string). | Type error → 500. Log as defect. 🟠 | ☐ |
| B-12 | Direct API: `POST` with `startsAt` not parseable as date (e.g. `"next week"`). | `new Date(...)` → Invalid Date; behavior undefined/error. Log as defect. 🟠 | ☐ |

## C. Admin — List & Empty States

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| C-01 | Fresh DB with **zero** tournaments → open `/admin/tournaments`. | Empty-state message "尚無賽事，點擊「新增賽事」建立". | ☐ |
| C-02 | List with many tournaments; confirm ordering. | Ordered by `startsAt` desc (newest first). | ☐ |
| C-03 | Toggle "新增賽事" button text while form open. | Button label switches to "取消"; clicking hides form without saving. | ☐ |
| C-04 | DB not configured (no `DATABASE_URL`) → open page. | GET returns `{ tournaments: [] }`; empty state shown (no crash). | ☐ |

## D. Admin — Monitor Registrations

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| D-01 | For a tournament **with** registrations, click its row. | Row expands; table shows columns 選手 / 電郵 / 電話 / 報名時間. | ☐ |
| D-02 | Verify a registration's phone is `null`. | Phone cell renders "—" (fallback). | ☐ |
| D-03 | For a tournament **with no** registrations, expand it. | Shows "暫無報名". | ☐ |
| D-04 | Click the same row again. | Row collapses (toggle). | ☐ |
| D-05 | Expand one row, then click a **different** row. | Only the newly clicked row is expanded (single-expansion behavior). | ☐ |
| D-06 | Count line `N / max 人` reflects actual registered rows. | N equals number of rows in the expanded table. | ☐ |
| D-07 | Register a new user (user side) while admin list open → refresh. | New player appears; count increments. | ☐ |

## E. Admin — Status Transitions & Lifecycle

> Manual dropdown is **filtered by `allowedTransitions()`**. Time-based sync also auto-advances statuses on read.

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| E-01 | OPEN tournament → open status dropdown. | Only 報名中(OPEN) and 已取消(CANCELLED) selectable. 🟠 (spec wanted OPEN→FULL→… manual — see notes) | ☐ |
| E-02 | Select "已取消" for an OPEN tournament. | PATCH succeeds; badge/status becomes CANCELLED; dropdown now offers CANCELLED + OPEN. | ☐ |
| E-03 | CANCELLED → select "報名中 (OPEN)". | Reopens to OPEN successfully. | ☐ |
| E-04 | FULL tournament → open dropdown. | Only FULL and CANCELLED offered (cannot revert to OPEN). | ☐ |
| E-05 | IN_PROGRESS tournament → dropdown. | Only IN_PROGRESS and CANCELLED offered. | ☐ |
| E-06 | COMPLETED tournament → dropdown. | Disabled (terminal); `allowedTransitions` returns only `[COMPLETED]`. | ☐ |
| E-07 | Tournament whose **end time** (start + duration) is in the past but status still OPEN. | On next list load, status auto-syncs → COMPLETED (via `effectiveStatus`). | ☐ |
| E-08 | Tournament past **start** but before end, status OPEN. | Auto-syncs → IN_PROGRESS on read. | ☐ |
| E-09 | IN_PROGRESS past end time. | Auto-syncs → COMPLETED (never reverts). | ☐ |
| E-10 | DRAFT or CANCELLED past end time. | **Preserved** (never auto-advanced). | ☐ |
| E-11 | Direct API: `PATCH /api/admin/tournaments/{id}` with `{status:"COMPLETED"}` on an OPEN tournament. | 400 `{ error: "無法變更為此狀態" }`. | ☐ |
| E-12 | Direct API: PATCH a **non-existent** id. | 404 `{ error: "賽事不存在" }`. | ☐ |
| E-13 | Direct API: PATCH with `{}` (no status) or invalid JSON. | 400 (missing status) — note: invalid JSON `request.json()` may throw uncaught; verify it returns 400, not 500. 🟡 | ☐ |
| E-14 | Cancel a tournament that already has registrations. | Status → CANCELLED; registrations remain in DB (not deleted); user-side it disappears from public list. | ☐ |
| E-15 | Expand a deadline-passed tournament (shows "目前已過截止時間"). Edit 報名截止 to a **future** date/time → "更新截止時間". | PATCH `/api/admin/tournaments/{id}` with `{ registrationDeadline }` succeeds; on reload the public list/register page show **OPEN** again (calculated status reverts — no stored-status change). | ☐ |
| E-16 | Set the deadline editor time to an invalid format (e.g. `25:99`) and click 更新截止時間. | Inline TimeField error + `alert` "請輸入正確的時間格式…"; no PATCH sent. | ☐ |
| E-17 | Direct API: PATCH with `{ registrationDeadline: "not-a-date" }`. | 400 `{ error: "截止時間格式不正確" }`. | ☐ |
| E-18 | Direct API: PATCH with `{}` (neither status nor deadline). | 400 `{ error: "沒有可更新的欄位" }`. | ☐ |

## F. Admin — Access Control / Auth

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| F-01 | Not logged in → `GET /api/admin/tournaments`. | 401 `{ error: "請先登入" }`. | ☐ |
| F-02 | Logged in as **USER** → `GET /api/admin/tournaments`. | 403 `{ error: "拒絕存取 (403)" }`. | ☐ |
| F-03 | Not admin → `POST /api/admin/tournaments`. | 401/403; no tournament created. | ☐ |
| F-04 | Not admin → `PATCH /api/admin/tournaments/{id}`. | 401/403; status unchanged. | ☐ |
| F-05 | Middleware/route guard on `/admin/tournaments` page itself. | Non-admin is redirected/blocked from the admin page. | ☐ |

## G. Admin — Error Handling / Server Resilience

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| G-01 | DB down (kill Postgres) → open `/admin/tournaments`. | GET list does **not** crash the page; degrades gracefully (empty list / error). | ☐ |
| G-02 | DB down → `POST /api/admin/tournaments`. | No 500 stack leak; returns an error response (confirm HTTP code + message). 🟡 | ☐ |
| G-03 | `syncTournamentStatuses` throws (simulate). | Swallowed (logged); listing still returns — never throws to caller. | ☐ |
| G-04 | Network drop during "建立賽事". | No silent success; form stays; user can retry. (Note: current code does **not** show an error if `res.ok` is false — verify UX.) 🟡 | ☐ |

## H. User — Tournament List (Public `/tournaments`)

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| H-01 | Open `/tournaments` (logged out allowed). | Grid of published tournaments; statuses synced to HK time first. | ☐ |
| H-02 | Tournament statuses include DRAFT / CANCELLED / COMPLETED. | **Hidden** from public list (only OPEN, FULL, IN_PROGRESS shown). | ☐ |
| H-03 | Card for OPEN with spots left. | Badge green "報名中"; button "立即報名". | ☐ |
| H-04 | Card for tournament at capacity (registered ≥ max) but stored status OPEN. | Badge shows "已滿"; button "查看詳情". | ☐ |
| H-05 | Free tournament card. | Footer shows "免費". | ☐ |
| H-06 | Paid tournament card. | Footer shows formatted HKD (e.g. `HK$80`). | ☐ |
| H-07 | DB not configured. | Falls back to `DEMO_TOURNAMENTS`; page still renders. | ☐ |
| H-08 | Card "查看詳情"/"立即報名" links. | Navigate to `/tournaments/{slug}/register`. | ☐ |
| H-09 | Any tournament card. | Shows a "報名截止：…" line with the formatted `registrationDeadline`. | ☐ |
| H-10 | Card whose `registrationDeadline` has passed (status still stored OPEN, before start). | Calculated status = `DEADLINE_PASSED`; badge shows "已截止"; CTA is a **disabled** "已截止" (not a link). | ☐ |

## I. User — Registration, FREE tournament (Happy Path)

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| I-01 | Open register page for a free OPEN tournament. | Summary card (title, format, time, location, duration, count, "免費"); form with 姓名/電郵/電話 (all *). | ☐ |
| I-02 | Fill valid name, email `a@b.com`, phone `9876 5432`; submit. | Button "確認報名"; on success → inline success screen "報名成功！". | ☐ |
| I-03 | Verify in admin expanded table. | New row appears with the same name/email/normalized phone/time. | ☐ |
| I-04 | No-refund warning. | **Not** shown for free tournaments (only paid). | ☐ |
| I-05 | Google Calendar button (future OPEN event). | Visible; opens a valid Google Calendar event URL (title/time/location). | ☐ |
| I-06 | DB returns 201. | `POST /api/tournaments/register` returns 201 with `{ registration }`. | ☐ |

## J. User — Registration, PAID tournament (Happy Path, Stripe test)

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| J-01 | Open register page for a paid OPEN tournament. | Summary shows HKD fee; payment-method info box; **no-refund warning** shown; button reads `確認報名並付款（HK$80）`. | ☐ |
| J-02 | Submit valid form. | Redirected to Stripe Checkout (test mode); customer email pre-filled. | ☐ |
| J-03 | Pay with `4242 … 4242` (success). | Redirected to `/register/success?session_id=…`; success screen with player name + title. | ☐ |
| J-04 | Verify registration `paymentStatus`. | DB row is **PAID** (via webhook or self-heal). | ☐ |
| J-05 | Pay with decline card `4000 … 9995`. | Stripe shows decline; no PAID registration created (row stays PENDING or none). | ☐ |
| J-06 | Pay with 3DS card `4000 … 3184`, complete auth. | Success redirect; registration PAID. | ☐ |
| J-07 | **Cancel** on Stripe checkout. | Redirected back to `/register?cancelled=1`; amber notice "你已取消付款。報名尚未完成…"; form re-submittable. | ☐ |
| J-08 | Retry after cancel with same email. | Allowed (previous PENDING row deleted on retry); new Checkout created. | ☐ |
| J-09 | Stripe **not configured** but tournament is paid. | `POST` returns 503 with message "此賽事需要網上付款，但付款系統暫未設定…". | ☐ |
| J-10 | Amount sent to Stripe. | `unit_amount = entryFee * 100` (e.g. 80 → 8000), currency `hkd`. | ☐ |

## K. User — Registration Validation / Edge

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| K-01 | Submit with empty 姓名. | Browser `required` blocks; or API 400 "請輸入姓名". | ☐ |
| K-02 | Submit with whitespace-only name `"   "`. | API 400 "請輸入姓名" (trim check). | ☐ |
| K-03 | Submit with empty/invalid email. | API 400 "電郵格式不正確" (regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`). | ☐ |
| K-04 | Email `"a@b"` (no TLD dot). | 400 (regex requires a dot). | ☐ |
| K-05 | Empty phone. | API 400 "請輸入電話號碼". | ☐ |
| K-06 | Phone with formatting `"9876-5432"`, `"(9876) 5432"`. | Accepted; normalized to digits; stored consistently for duplicate checks. | ☐ |
| K-07 | Phone all separators `" - () "`. | 400 "請輸入有效的電話號碼" (normalizes to empty). | ☐ |
| K-08 | Missing `tournamentId` (direct API). | 400 "缺少賽事編號". | ☐ |
| K-09 | Malformed JSON body (direct API). | 400 "請求格式錯誤". | ☐ |
| K-10 | Very long name / email / phone (e.g. 1000 chars). | Handled without 500; stored or rejected gracefully (verify). 🟡 | ☐ |
| K-11 | Name/email with CJK + emoji. | Accepted; rendered correctly in admin table. | ☐ |

## L. User — Registration Error Handling (state conflicts)

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| L-01 | Register a tournament that doesn't exist (bad id). | 404 "賽事不存在". | ☐ |
| L-02 | Register a tournament whose effective status ≠ OPEN (IN_PROGRESS/COMPLETED/FULL). | 400 "此賽事已不再接受報名". | ☐ |
| L-03 | Register when `registeredCount ≥ maxPlayers`. | 400 "名額已滿". | ☐ |
| L-04 | Register **same email** twice for same tournament (prior = PAID/free confirmed). | 409 "此電郵已報名此賽事". | ☐ |
| L-05 | Register **same phone** (different email) — variant formatting `"98765432"` vs `"9876-5432"`. | 409 "此電話號碼已報名此賽事". | ☐ |
| L-06 | Register same email where prior attempt = **PENDING** (unpaid). | Old PENDING row **deleted**, new attempt proceeds (retry allowed). | ☐ |
| L-07 | DB connection error (kill Postgres). | 503 "數據庫連接失敗，請稍後再試". | ☐ |
| L-08 | DB not configured at all. | 503 "報名系統暫時無法使用". | ☐ |
| L-09 | Generic/unknown Prisma error. | 500 "報名失敗，請重試"; no stack trace in response. | ☐ |
| L-10 | Network failure mid-submit (offline). | UI shows "網絡錯誤，請檢查連接後重試"; no partial UI corruption. | ☐ |
| L-11 | Register for a tournament **past its `registrationDeadline`** but before start. | **Rejected:** API returns 400 `{ error: "報名已截止" }`. (Calculated status is DEADLINE_PASSED.) | ☐ |
| L-12 | Open the register page for a tournament past its `registrationDeadline` (slots left). | Summary shows "報名截止：…"; form stays visible but **locked**: amber "報名已截止" notice + submit button **disabled** showing "已截止". | ☐ |
| L-13 | Register page **before** the deadline. | "報名截止：…" line shown; form active; submit button enabled ("確認報名" / "確認報名並付款"). | ☐ |

## M. Time-based Status Sync (HK time, lazy on read)

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| M-01 | Seed OPEN tournament starting in 1 min; wait; refresh public list. | Flips to IN_PROGRESS at start (HK time). | ☐ |
| M-02 | Same, wait past start+duration; refresh. | Flips to COMPLETED. | ☐ |
| M-03 | Once COMPLETED, set clock back / refresh. | Stays COMPLETED (terminal; never reverts). | ☐ |
| M-04 | DRAFT/CANCELLED past end time. | Unchanged (manual override). | ☐ |
| M-05 | Verify sync runs on **both** admin GET and public `getPublishedTournaments`. | Status consistent across admin and user views after the same instant. | ☐ |
| M-06 | Multiple tournaments due to advance in one read. | All updated in a single transaction; partial-failure does not corrupt listing. | ☐ |
| M-07 | `effectiveStatus` with `durationMinutes = 0` or null. | End = start; advances correctly (no NaN). | ☐ |

## N. Payment Webhook & Self-heal

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| N-01 | Send `checkout.session.completed` for a tournament registration (test trigger). | Webhook finds row by `stripeSessionId`; PENDING → PAID. | ☐ |
| N-02 | Replay the same webhook event. | Idempotent — stays PAID, no error. | ☐ |
| N-03 | Webhook for unknown `stripeSessionId`. | Returns `{ received: true }`; no crash, no row created. | ☐ |
| N-04 | Webhook with **missing signature** / wrong secret. | 400; event rejected. | ☐ |
| N-05 | Webhook when DB down. | Returns `{ received: true }` early (no 500). | ☐ |
| N-06 | Success page **before** webhook arrives. | `/api/tournaments/register/session` self-heals: Stripe says paid → flips PENDING→PAID → success screen shows. | ☐ |
| N-07 | Success page with **missing** `session_id`. | Renders "無法確認付款 / 缺少付款記錄…". | ☐ |
| N-08 | Success page `session_id` for an **unpaid** session. | `{ paid:false }` → "付款尚未完成"; error UI. | ☐ |
| N-09 | Stripe API error during session retrieve. | Returns 400 with message; UI shows graceful error. | ☐ |

## O. Concurrency / Race / Resilience

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| O-01 | Two users register the **last** slot simultaneously (maxPlayers=1, 2 requests). | Exactly one succeeds; other gets 400 "名額已滿" or 409. (Note: capacity is checked then create — verify no double-booking under race.) 🟠 | ☐ |
| O-02 | Two simultaneous registrations with same email. | Unique constraint `tournamentId_email` → one 201, one 409 (or P2002 path). | ☐ |
| O-03 | Two simultaneous registrations with same phone. | One succeeds; other 409 (note: phone check is app-level fetch+compare — verify under race). 🟠 | ☐ |
| O-04 | Rapid double-click on "確認報名". | Button disabled while loading (`status==="loading"`); no duplicate submission. | ☐ |
| O-05 | Admin changes status to CANCELLED **while** a user is mid-registration. | User's in-flight request either 400 "已不再接受報名" or completes before cancel; no corrupt state. | ☐ |

## P. Other User-Likely Behaviours (UX / browser)

| ID | Step / Action | Expected Result | Pass/Fail |
|---|---|---|---|
| P-01 | Open register page for a **non-existent slug**. | "賽事不存在" + "返回賽事列表" button. | ☐ |
| P-02 | Register page initial load. | Skeleton pulse placeholders while `loadingTournament`. | ☐ |
| P-03 | Press browser **Back** after free registration success. | Returns to form (not a re-submit); no duplicate created on refresh. | ☐ |
| P-04 | **Refresh** the success page (free). | Stays on success (client state); no second registration posted. | ☐ |
| P-05 | **Refresh** Stripe success page. | Re-queries session; still shows success (idempotent). | ☐ |
| P-06 | Open a finished (COMPLETED/CANCELLED) tournament's register page via direct URL. | "名額已滿 / 此賽事已不再接受報名" gate (since status ≠ OPEN). | ☐ |
| P-07 | Long tournament title / many tournaments. | Layout intact; no overflow; counts readable. | ☐ |
| P-08 | Mobile viewport — admin form (2-col → 1-col) and user register page. | Responsive; all inputs usable. | ☐ |
| P-09 | Dark mode rendering across list + register + success. | No contrast/visibility issues; amber/red notices legible. | ☐ |
| P-10 | Accessibility: labels associated (`htmlFor`), required fields marked, button states. | Screen-reader announces 姓名/電郵/電話 and required; loading state announced. | ☐ |
| P-11 | Paste an email with leading/trailing spaces `" a@b.com "`. | Trimmed before validation/storage & duplicate check. | ☐ |
| P-12 | Tournament list reflects a **newly created** tournament without manual cache clear (`force-dynamic`). | Visible to users immediately after admin creates it. | ☐ |

---

## Defects / Risks observed during spec review (pre-test)

These are inferred from code reading; confirm with the cases above before logging.

1. ✅ **FIXED — Registration deadline now enforced via a *calculated* status.** A new `displayStatus()` returns `DEADLINE_PASSED` (已截止) when a pre-event tournament (OPEN/FULL) is past its `registrationDeadline`; it is never stored, so extending the deadline instantly reverts it to OPEN. Surfaces: public list badge + disabled CTA, register page locked form, API 400 `報名已截止`. Admin can edit the deadline via PATCH `{ registrationDeadline }`. (Was: deadline stored but never used.)
2. 🟠 **Admin cannot manually drive OPEN→FULL→IN_PROGRESS→COMPLETED** (E-01). `allowedTransitions("OPEN") = [OPEN, CANCELLED]`. The lifecycle is time-driven only, which deviates from the literal Step-5 requirement "Update tournament status as event progresses (OPEN → FULL → IN_PROGRESS → COMPLETED)".
3. 🟠 **No input validation on admin create** (B-07, B-08, B-10–B-12, G-02). Negative `entryFee`/`maxPlayers`, missing `title`, bad date — all reach Prisma and can yield 500 with no friendly message (no try/catch on create).
4. 🟠 **No `registrationDeadline` ≤ `startsAt` guard** (B-05).
5. 🟡 **Create UX silence on failure** (G-04): if `res.ok` is false, the form does nothing (no error message).
6. 🟡 **FULL is never set automatically**; the public badge relies on client-side `spotsLeft` math, while the stored status stays OPEN.
7. 🟠 **Race conditions** (O-01, O-03): capacity and phone-uniqueness are checked in JS then written — TOCTOU window; rely on the DB unique constraint for email but not for capacity/phone.

---

## Sign-off

- **Blockers open:** _____   **Majors open:** _____   **Minor open:** _____
- **Verdict:** ☐ Pass  ☐ Pass with conditions  ☐ Fail
- **Notes:** _______________________________________________
