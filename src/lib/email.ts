import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { SITE_BRAND } from "@/lib/constants";
import {
  OrderReceiptEmail,
  type OrderReceiptItem,
} from "@/emails/order-receipt";
import { TournamentCancelledEmail } from "@/emails/tournament-cancelled";
import { OtpVerificationEmail } from "@/emails/otp-verification";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return transporter;
}

function getFromEmail(): string {
  return process.env.SMTP_USER ?? process.env.SMTP_FROM_EMAIL ?? "";
}

/**
 * Low-level SMTP send. Returns true on success, false on failure.
 * Errors are logged but never thrown.
 */
async function sendViaSmtp(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.log("[email] SMTP credentials not set, skipping email");
    return false;
  }

  const from = getFromEmail();
  if (!from) {
    console.error("[email] SMTP_FROM_EMAIL / SMTP_USER not set");
    return false;
  }

  try {
    await transport.sendMail({
      from: `"${SITE_BRAND}" <${from}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return true;
  } catch (err) {
    console.error("[email] SMTP send failed:", err);
    return false;
  }
}

/**
 * 發送訂單確認電郵。
 * 不會拋出例外 — 如果 SMTP 未設定或發送失敗，只記錄到 console。
 */
export async function sendOrderReceipt(input: {
  to: string;
  orderId: string;
  items: OrderReceiptItem[];
  totalAmount: number;
  orderDate: string;
}): Promise<void> {
  if (!getTransporter()) {
    console.log(
      `[email] SMTP 未設定，跳過訂單確認電郵 (order ${input.orderId.slice(0, 8)})`,
    );
    return;
  }

  try {
    const html = await render(
      OrderReceiptEmail({
        orderId: input.orderId,
        customerEmail: input.to,
        items: input.items,
        totalAmount: input.totalAmount,
        orderDate: input.orderDate,
      }),
    );

    await sendViaSmtp({
      to: input.to,
      subject: `${SITE_BRAND} 訂單確認 — 感謝您的購買`,
      html,
    });
  } catch (err) {
    console.error(`[email] 訂單確認電郵例外:`, err);
  }
}

/**
 * 發送店賽取消通知電郵給所有報名者。
 * 不會拋出例外 — 如果 SMTP 未設定或發送失敗，只記錄到 console。
 */
export async function sendTournamentCancellation(input: {
  registrations: {
    email: string;
    playerName: string;
  }[];
  tournamentTitle: string;
  startsAt: string;
  location: string;
}): Promise<void> {
  if (!getTransporter()) {
    console.log(
      `[email] SMTP 未設定，跳過店賽取消通知 (${input.registrations.length} 位報名者)`,
    );
    return;
  }

  for (const reg of input.registrations) {
    try {
      const html = await render(
        TournamentCancelledEmail({
          tournamentTitle: input.tournamentTitle,
          startsAt: input.startsAt,
          location: input.location,
          playerName: reg.playerName,
        }),
      );

      await sendViaSmtp({
        to: reg.email,
        subject: `${SITE_BRAND} 店賽取消通知 — ${input.tournamentTitle}`,
        html,
      });
    } catch (err) {
      console.error(`[email] 店賽取消通知例外 (${reg.email}):`, err);
    }
  }
}

/**
 * 產生 WhatsApp wa.me 深度連結，帶有預填訊息。
 */
export function buildWhatsAppLink(
  orderNumber: string,
  customerEmail: string,
  totalAmount: number,
  items: { name: string; quantity: number }[],
): string {
  const phone = process.env.SHOP_WHATSAPP_NUMBER;
  if (!phone) return "";

  const itemLines = items
    .map((i) => `• ${i.name} ×${i.quantity}`)
    .join("\n");

  const message = [
    `${SITE_BRAND} 新訂單通知`,
    `訂單編號：${orderNumber}`,
    `顧客電郵：${customerEmail}`,
    `總計：HKD ${totalAmount}`,
    ``,
    `訂單內容：`,
    itemLines,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * 發送 OTP 驗證碼電郵。
 * 用於註冊驗證及忘記密碼。
 * 不會拋出例外。
 */
export async function sendOtpEmail(input: {
  to: string;
  code: string;
  purpose: "registration" | "password-reset";
  name?: string;
}): Promise<boolean> {
  if (!getTransporter()) {
    console.log(`[email] SMTP 未設定，跳過 OTP 電郵 (${input.to})`);
    return false;
  }

  try {
    const title =
      input.purpose === "registration" ? "註冊驗證碼" : "重設密碼驗證碼";
    const html = await render(
      OtpVerificationEmail({
        code: input.code,
        purpose: input.purpose,
        name: input.name,
      }),
    );

    return await sendViaSmtp({
      to: input.to,
      subject: `${SITE_BRAND} ${title} — ${input.code}`,
      html,
    });
  } catch (err) {
    console.error(`[email] OTP 電郵例外:`, err);
    return false;
  }
}
