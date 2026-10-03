# WhatsApp Cloud API Integration — Implementation Plan

| Field | Value |
|-------|-------|
| **Status** | Pending supervisor approval |
| **Date** | 2026-08-11 |
| **Supersedes** | ADR-001 §Decision 1 — "Admin WhatsApp: wa.me deep link (manual)" |
| **Depends on** | Meta Business account, WhatsApp Business API access |

---

## Context

ADR-001 chose **wa.me deep links** (manual click) for shop WhatsApp notifications, reasoning that the WhatsApp Cloud API was "premature" at current volume. The project owner now wants to upgrade to **automatic sending** via the WhatsApp Business Cloud API.

### What's Already Built (Email Channel)

| Trigger | Recipient | Channel | Status |
|---------|-----------|---------|--------|
| Order paid | Customer | Email (Resend) | ✅ Wired into Stripe webhook |
| Tournament cancelled | All registrants | Email (Resend) | ✅ Wired into tournament PATCH |

### What This Plan Adds

| Trigger | Recipient | Channel | Status |
|---------|-----------|---------|--------|
| Order paid | Shop owner | WhatsApp (Cloud API — automatic) | 🔲 New |
| Tournament cancelled | Shop owner | WhatsApp (Cloud API — automatic) | 🔲 New |

**Note:** WhatsApp notifications go to the **shop owner**, not the customer. Email notifications to customers remain unchanged.

---

## API Verification (Completed 2026-08-11)

The full send pipeline was tested end-to-end:

| Item | Value | Status |
|------|-------|--------|
| Meta App | "testing to tcghk" (`1043659574958766`) | ✅ |
| Phone Number ID | `1225952203940584` (Meta test number +1 555-665-0490) | ✅ Verified |
| Scopes | `whatsapp_business_messaging` + `whatsapp_business_management` | ✅ |
| Test send | `hello_world` template → `85254410989` | ✅ Message accepted |

---

## Token Strategy

### Current (Testing)

- **Type:** User Access Token (from Graph API Explorer)
- **Expiry:** Short-lived — expires in hours/days
- **Good for:** Development, testing the full pipeline

### Production (Client Setup Required)

Two paths, depending on what the client can provide:

| Path | Token Type | Expiry | Requirements |
|------|-----------|--------|--------------|
| **A. System User Token** (recommended) | System User | Never (until revoked) | Client provides Business Manager access OR creates the token themselves |
| **B. Long-Lived User Token** (fallback) | User | ~60 days | App ID + App Secret — can be exchanged via Graph API |

**Path A** is strongly preferred. The client creates a System User token in Meta Business Settings and pastes it into `.env`. No code changes needed.

**Path B** works but requires re-exchanging the token every 60 days.

Either way: **swapping tokens is a `.env` change only — zero code changes.**

---

## Required Environment Variables

```env
# ── Required ──────────────────────────────────────────────
WHATSAPP_TOKEN=                    # Access token (test or permanent)
WHATSAPP_PHONE_NUMBER_ID=          # Sender phone-number ID from Meta dashboard
WHATSAPP_SHOP_NUMBER=              # Recipient — the shop's WhatsApp number (e.g. 85254410989)

# ── Optional (defaults shown) ─────────────────────────────
WHATSAPP_API_VERSION=v21.0         # Graph API version
WHATSAPP_ORDER_TEMPLATE=hello_world    # Template name for order alerts
WHATSAPP_CANCEL_TEMPLATE=hello_world   # Template name for cancellation alerts
WHATSAPP_TEMPLATE_LANG=en_US       # Template language code
```

When `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` is not set, the WhatsApp functions silently no-op (same pattern as Resend email). This means the app works fine without WhatsApp configured — email notifications still fire.

---

## Message Templates

WhatsApp requires **pre-approved templates** for business-initiated messages (messages sent to users who haven't messaged you in the last 24 hours). Free-form text is not allowed.

### Template 1: Order Notification

Created in Meta dashboard → WhatsApp → Templates:

| Field | Value |
|-------|-------|
| **Name** | `order_notification` |
| **Category** | UTILITY |
| **Language** | zh_HK (or en_US) |
| **Body** | `新訂單 {{1}} — 顧客：{{2}} — 金額：HKD {{3}}` |

Parameters sent by code:

| Variable | Content |
|----------|---------|
| `{{1}}` | Order number |
| `{{2}}` | Customer email |
| `{{3}}` | Total amount in HKD |

### Template 2: Tournament Cancellation

| Field | Value |
|-------|-------|
| **Name** | `cancel_notification` |
| **Category** | UTILITY |
| **Language** | zh_HK (or en_US) |
| **Body** | `店賽取消：{{1}}（影響 {{2}} 名報名者）` |

Parameters sent by code:

| Variable | Content |
|----------|---------|
| `{{1}}` | Tournament title |
| `{{2}}` | Registration count |

### Testing Without Custom Templates

If templates aren't created yet, the code defaults to `hello_world` (Meta's pre-approved test template) and sends without parameters. This lets you test the full pipeline immediately.

---

## Implementation Plan

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/whatsapp.ts` | WhatsApp Cloud API client — `notifyShopOrderReceived()` + `notifyShopTournamentCancelled()` |
| `src/app/api/admin/whatsapp-test/route.ts` | Admin-only test endpoint — `GET /api/admin/whatsapp-test?type=order` or `?type=cancel` |

### Files to Modify

| File | Change |
|------|--------|
| `src/app/api/webhooks/stripe/route.ts` | Add `notifyShopOrderReceived()` call after `sendOrderReceipt()` |
| `src/app/api/admin/tournaments/[id]/route.ts` | Add `notifyShopTournamentCancelled()` call after `sendTournamentCancellation()` |

### Architecture

```
Order paid (Stripe webhook)
  ├── sendOrderReceipt()           → Customer email (Resend)
  └── notifyShopOrderReceived()    → Shop WhatsApp (Cloud API)

Tournament cancelled (admin PATCH)
  ├── sendTournamentCancellation()   → All registrant emails (Resend)
  └── notifyShopTournamentCancelled() → Shop WhatsApp (Cloud API)
```

Both WhatsApp functions are **non-blocking** — they catch errors internally and never throw. If WhatsApp fails, the order/tournament update still succeeds. Same pattern as the existing email notifications.

### `src/lib/whatsapp.ts` — Design

```
getConfig()                          → reads WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID
                                     → returns null if not set (silent no-op)

sendTemplate(to, template, lang, components?)  → low-level API call
                                               → POST graph.facebook.com/v21.0/{phoneId}/messages

notifyShopOrderReceived(input)       → high-level: reads WHATSAPP_SHOP_NUMBER
  ├── template = WHATSAPP_ORDER_TEMPLATE (default: hello_world)
  └── components = [orderNumber, customerEmail, totalAmount]

notifyShopTournamentCancelled(input) → high-level: reads WHATSAPP_SHOP_NUMBER
  ├── template = WHATSAPP_CANCEL_TEMPLATE (default: hello_world)
  └── components = [tournamentTitle, registrationCount]
```

---

## Cost

| Item | Cost |
|------|------|
| Meta test number | Free |
| Custom templates | Free to create |
| **Per message (business-initiated, HK)** | ~HKD 0.3–0.8 per conversation |
| **Free tier** | 1,000 service conversations/month free |

For a small TCG shop expecting ~50–100 orders/month, the cost is negligible (under HKD 80/month).

---

## What the Client Needs to Do

### For Production

1. **Create message templates** in Meta Dashboard → WhatsApp → Templates (see "Message Templates" above)
2. **Set env vars** in `.env`:
   - `WHATSAPP_TOKEN` — permanent System User token (from Meta Business Settings)
   - `WHATSAPP_PHONE_NUMBER_ID` — their business phone number ID
   - `WHATSAPP_SHOP_NUMBER` — the shop's WhatsApp number
   - `WHATSAPP_ORDER_TEMPLATE=order_notification`
   - `WHATSAPP_CANCEL_TEMPLATE=cancel_notification`
3. **Complete Meta Business verification** — required to send to numbers beyond test recipients

### For Testing Only

1. Set `WHATSAPP_TOKEN` to the temporary test token
2. Set `WHATSAPP_PHONE_NUMBER_ID=1225952203940584`
3. Set `WHATSAPP_SHOP_NUMBER=<test recipient number>`
4. Leave template names as default (`hello_world`)
5. Use `GET /api/admin/whatsapp-test?type=order` to test

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Token expires (test token) | App continues working — WhatsApp silently no-ops, email still sends |
| Template rejected by Meta | Fall back to `hello_world` or adjust template wording |
| Rate limiting | WhatsApp enforces 80 msg/sec for Cloud API — far beyond our needs |
| Meta policy change | The Cloud API is Meta's official offering; BSPs (Twilio, Wati) add a layer but same underlying risk |
| Cost overrun | Monitor in Meta dashboard; set spending alerts |

---

## Open Questions for Supervisor

1. **Business verification:** Can the client provide Meta Business Manager access, or will they create the System User token themselves?
2. **Template approval:** Are the proposed template bodies (Chinese text) acceptable, or should we use English?
3. **Phone number:** Should we use the Meta test number for now, or does the client have a dedicated WhatsApp Business number?
4. **Budget:** Is the ~HKD 0.3–0.8 per message cost approved?
