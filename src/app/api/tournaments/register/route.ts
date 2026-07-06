import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { effectiveStatus } from "@/lib/tournament-status";

/** Prisma / Postgres connection-level error codes */
const DB_CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "P1001",
  "P1002",
  "P1017",
]);

/** 移除電話號碼中的空白、連字號及括號等格式字元，方便比對 */
function normalizePhone(p: string): string {
  return p.replace(/[\s\-()]/g, "");
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "報名系統暫時無法使用" },
      { status: 503 },
    );
  }

  let body: {
    tournamentId?: string;
    playerName?: string;
    email?: string;
    phone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { tournamentId, playerName, email, phone } = body;

  // Validate required fields
  if (!tournamentId) {
    return NextResponse.json({ error: "缺少賽事編號" }, { status: 400 });
  }
  if (!playerName || !playerName.trim()) {
    return NextResponse.json({ error: "請輸入姓名" }, { status: 400 });
  }
  if (!email || !email.trim()) {
    return NextResponse.json({ error: "請輸入電郵" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: "電郵格式不正確" }, { status: 400 });
  }

  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "請輸入電話號碼" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone.trim());
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "請輸入有效的電話號碼" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  try {
    // Check tournament exists and is open
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { registrations: true } } },
    });

    if (!tournament) {
      return NextResponse.json({ error: "賽事不存在" }, { status: 404 });
    }

    const effective = effectiveStatus(
      tournament.status,
      tournament.startsAt,
      tournament.durationMinutes,
    );
    if (effective !== "OPEN") {
      return NextResponse.json(
        { error: "此賽事已不再接受報名" },
        { status: 400 },
      );
    }

    // Enforce the registration deadline. It is an absolute instant (pinned from
    // the admin's local-time input), so comparing against now() is correct
    // regardless of server timezone — same approach as effectiveStatus().
    if (new Date(tournament.registrationDeadline) < new Date()) {
      return NextResponse.json({ error: "報名已截止" }, { status: 400 });
    }

    if (tournament._count.registrations >= tournament.maxPlayers) {
      return NextResponse.json({ error: "名額已滿" }, { status: 400 });
    }

    // Check duplicate email for this tournament
    const existing = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_email: {
          tournamentId,
          email: email.trim(),
        },
      },
    });

    if (existing) {
      // Allow retry if previous attempt is still pending payment
      if (existing.paymentStatus === "PENDING") {
        await prisma.tournamentRegistration.delete({
          where: { id: existing.id },
        });
      } else {
        return NextResponse.json(
          { error: "此電郵已報名此賽事" },
          { status: 409 },
        );
      }
    }

    // Check duplicate phone for this tournament（忽略空白／連字號等格式差異）
    const existingPhones = await prisma.tournamentRegistration.findMany({
      where: { tournamentId },
      select: { phone: true },
    });
    if (
      existingPhones.some(
        (r) => r.phone != null && normalizePhone(r.phone) === normalizedPhone,
      )
    ) {
      return NextResponse.json(
        { error: "此電話號碼已報名此賽事" },
        { status: 409 },
      );
    }

    const requiresPayment = tournament.entryFee > 0;

    // ── Paid tournament: create Stripe Checkout Session ──────────────
    if (requiresPayment) {
      if (!isStripeConfigured()) {
        return NextResponse.json(
          {
            error:
              "此賽事需要網上付款，但付款系統暫未設定。請聯絡門市以其他方式報名。",
          },
          { status: 503 },
        );
      }

      const stripe = getStripe();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email.trim(),
        line_items: [
          {
            price_data: {
              currency: "hkd",
              product_data: {
                name: `${tournament.title} — 報名費`,
              },
              unit_amount: Math.round(tournament.entryFee * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/tournaments/${tournament.slug}/register/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/tournaments/${tournament.slug}/register?cancelled=1`,
        metadata: {
          type: "tournament_registration",
          tournamentId,
          playerName: playerName.trim(),
          email: email.trim(),
          phone: normalizedPhone,
        },
      });

      // Create registration as PENDING — webhook marks it PAID on payment.
      await prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          playerName: playerName.trim(),
          email: email.trim(),
          phone: normalizedPhone,
          paymentStatus: "PENDING",
          stripeSessionId: checkoutSession.id,
        },
      });

      if (!checkoutSession.url) {
        throw new Error("無法建立付款連結");
      }

      return NextResponse.json({ url: checkoutSession.url });
    }

    // ── Free tournament: create registration directly ────────────────
    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        playerName: playerName.trim(),
        email: email.trim(),
        phone: normalizedPhone,
      },
    });

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error: unknown) {
    console.error("Registration error:", error);

    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as Record<string, unknown>).code)
        : "";

    if (DB_CONNECTION_ERRORS.has(code)) {
      return NextResponse.json(
        { error: "數據庫連接失敗，請稍後再試" },
        { status: 503 },
      );
    }

    if (code === "P2002") {
      return NextResponse.json(
        { error: "此電郵或電話已報名此賽事" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "報名失敗，請重試" }, { status: 500 });
  }
}
