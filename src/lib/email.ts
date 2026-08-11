import { Resend } from "resend";
import { SITE_BRAND } from "@/lib/constants";
import {
  OrderReceiptEmail,
  type OrderReceiptItem,
} from "@/emails/order-receipt";
import { TournamentCancelledEmail } from "@/emails/tournament-cancelled";

let client: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
}

/**
 * 發送訂單確認電郵。
 * 不會拋出例外 — 如果 Resend 未設定或發送失敗，只記錄到 console。
 */
export async function sendOrderReceipt(input: {
  to: string;
  orderId: string;
  items: OrderReceiptItem[];
  totalAmount: number;
  orderDate: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY 未設定，跳過訂單確認電郵 (order ${input.orderId.slice(0, 8)})`,
    );
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: getFromEmail(),
      to: input.to,
      subject: `${SITE_BRAND} 訂單確認 — 感謝您的購買`,
      react: OrderReceiptEmail({
        orderId: input.orderId,
        customerEmail: input.to,
        items: input.items,
        totalAmount: input.totalAmount,
        orderDate: input.orderDate,
      }),
    });

    if (error) {
      console.error(`[email] 訂單確認電郵發送失敗:`, error);
    }
  } catch (err) {
    console.error(`[email] 訂單確認電郵發送例外:`, err);
  }
}

/**
 * 發送店賽取消通知電郵給所有報名者。
 * 不會拋出例外 — 如果 Resend 未設定或發送失敗，只記錄到 console。
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
  const resend = getResend();
  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY 未設定，跳過店賽取消通知 (${input.registrations.length} 位報名者)`,
    );
    return;
  }

  const from = getFromEmail();

  for (const reg of input.registrations) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: reg.email,
        subject: `${SITE_BRAND} 店賽取消通知 — ${input.tournamentTitle}`,
        react: TournamentCancelledEmail({
          tournamentTitle: input.tournamentTitle,
          startsAt: input.startsAt,
          location: input.location,
          playerName: reg.playerName,
        }),
      });

      if (error) {
        console.error(
          `[email] 店賽取消通知發送失敗 (${reg.email}):`,
          error,
        );
      }
    } catch (err) {
      console.error(
        `[email] 店賽取消通知發送例外 (${reg.email}):`,
        err,
      );
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
