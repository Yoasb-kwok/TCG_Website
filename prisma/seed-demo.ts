/**
 * Demo data seed — accounts (varied points), tournaments, coupons,
 * registrations and transactions for the admin/user demo.
 *
 * Idempotent: re-running updates in place / replaces demo-marked rows.
 * Demo transactions carry remark "示範資料"; their point ledger entries
 * reference the transaction ids and are deleted+recreated together.
 *
 * Run: DATABASE_URL=<url> npx tsx prisma/seed-demo.ts
 */
import "dotenv/config";
import { hashPassword } from "../src/lib/auth-password";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_REMARK = "示範資料";
const DEMO_ADJUST_NOTE = "示範：歡迎禮點數";

/** mid-day UTC timestamps avoid month-boundary edge cases in HK time */
function d(iso: string): Date {
  return new Date(iso);
}

async function main() {
  if (!process.env.DATABASE_URL?.includes("neon.tech")) {
    console.log("⚠ DATABASE_URL is not a Neon URL — continuing anyway.");
  }

  const passwordHash = await hashPassword("123456");

  // ── 1. Demo users (role USER, password 123456) ────────────────────────
  const users = [
    { email: "demo.chan@example.com", name: "陳大文", phone: "61230001" },
    { email: "demo.wong@example.com", name: "黃小明", phone: "61230002" },
    { email: "demo.lee@example.com", name: "李嘉豪", phone: "61230003" },
    { email: "demo.cheung@example.com", name: "張美琪", phone: "61230004" },
    { email: "asdfghjklqaqlol@gmail.com", name: "盧卡斯（測試）", phone: "61230005" },
  ];

  const userIds: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, passwordHash, role: "USER" },
      update: { ...u, passwordHash, role: "USER", deletedAt: null },
    });
    userIds[u.email] = user.id;
    console.log(`✓ 用戶 ${user.email}（${user.name}）`);
  }

  // ── 2. Tournaments ─────────────────────────────────────────────────────
  const tournaments = [
    {
      slug: "summer-cup-2026-07",
      title: "夏季商店盃",
      description: "夏季特別活動賽事，歡迎所有級別玩家參加。",
      format: "標準賽制（Standard）瑞士輪 + 單淘汰",
      maxPlayers: 16,
      entryFee: 120,
      prizePool: "冠軍：補充包一盒 + 獎金 $500",
      location: "TCGHK 觀塘工作室",
      startsAt: d("2026-07-20T11:00:00Z"),
      registrationDeadline: d("2026-07-18T23:59:00Z"),
      durationMinutes: 240,
      status: "COMPLETED" as const,
    },
    {
      slug: "monthly-championship-2026-08",
      title: "月季冠軍賽（8月）",
      description: "每月一度的高水平賽事，爭奪月季冠軍頭銜。",
      format: "標準賽制（Standard）單淘汰",
      maxPlayers: 8,
      entryFee: 150,
      prizePool: "冠軍：SAR 特典卡 + 獎金 $800",
      location: "TCGHK 觀塘工作室",
      startsAt: d("2026-08-20T11:00:00Z"),
      registrationDeadline: d("2026-08-18T23:59:00Z"),
      durationMinutes: 180,
      status: "FULL" as const,
    },
    {
      slug: "standard-night-2026-08",
      title: "標準賽制對戰夜",
      description: "輕鬆的週五對戰夜，適合想在實戰中進步的玩家。",
      format: "標準賽制（Standard）瑞士輪三場",
      maxPlayers: 16,
      entryFee: 100,
      prizePool: "冠軍：特典卡一張",
      location: "TCGHK 觀塘工作室",
      startsAt: d("2026-08-26T11:00:00Z"),
      registrationDeadline: d("2026-08-24T23:59:00Z"),
      durationMinutes: 150,
      status: "OPEN" as const,
    },
    {
      slug: "beginner-welcome-2026-09",
      title: "新手體驗賽",
      description: "完全免費的新手賽事，有專人教學，參加即送小禮物。",
      format: "入門賽制（主題牌組）",
      maxPlayers: 24,
      entryFee: 0,
      prizePool: "全員：小禮物一份",
      location: "TCGHK 觀塘工作室",
      startsAt: d("2026-09-02T11:00:00Z"),
      registrationDeadline: d("2026-08-31T23:59:00Z"),
      durationMinutes: 120,
      status: "OPEN" as const,
    },
  ];

  const tid: Record<string, string> = {};
  for (const t of tournaments) {
    const row = await prisma.tournament.upsert({
      where: { slug: t.slug },
      create: t,
      update: { ...t, deletedAt: null },
    });
    tid[t.slug] = row.id;
    console.log(`✓ 賽事 ${row.title}（${row.status}）`);
  }

  // ── 3. Registrations ───────────────────────────────────────────────────
  // unique per tournament: [tournamentId, email] and [tournamentId, phone]
  const regs = [
    // 夏季商店盃 (COMPLETED)
    { slug: "summer-cup-2026-07", email: "demo.chan@example.com", playerName: "陳大文", phone: "61230001", paymentStatus: "PAID", userId: true },
    { slug: "summer-cup-2026-07", email: "demo.wong@example.com", playerName: "黃小明", phone: "61230002", paymentStatus: "PAID", userId: true },
    { slug: "summer-cup-2026-07", email: "demo.lee@example.com", playerName: "李嘉豪", phone: "61230003", paymentStatus: "PAID", userId: true },
    { slug: "summer-cup-2026-07", email: "guest.ho@example.com", playerName: "何先生", phone: "61230901", paymentStatus: "PAID", userId: false },
    // 月季冠軍賽 (FULL — 8/8)
    { slug: "monthly-championship-2026-08", email: "demo.chan@example.com", playerName: "陳大文", phone: "61230001", paymentStatus: "PAID", userId: true },
    { slug: "monthly-championship-2026-08", email: "demo.wong@example.com", playerName: "黃小明", phone: "61230002", paymentStatus: "PAID", userId: true },
    { slug: "monthly-championship-2026-08", email: "guest.lam@example.com", playerName: "林小姐", phone: "61230902", paymentStatus: "PAID", userId: false },
    { slug: "monthly-championship-2026-08", email: "guest.chow@example.com", playerName: "周生", phone: "61230903", paymentStatus: "PAID", userId: false },
    { slug: "monthly-championship-2026-08", email: "guest.ng@example.com", playerName: "吳太", phone: "61230904", paymentStatus: "PAID", userId: false },
    { slug: "monthly-championship-2026-08", email: "guest.tsui@example.com", playerName: "徐同學", phone: "61230905", paymentStatus: "PAID", userId: false },
    { slug: "monthly-championship-2026-08", email: "guest.yip@example.com", playerName: "葉先生", phone: "61230906", paymentStatus: "PAID", userId: false },
    { slug: "monthly-championship-2026-08", email: "guest.cheung@example.com", playerName: "張同學", phone: "61230907", paymentStatus: "PAID", userId: false },
    // 標準賽制對戰夜 (OPEN)
    { slug: "standard-night-2026-08", email: "demo.cheung@example.com", playerName: "張美琪", phone: "61230004", paymentStatus: "PAID", userId: true },
    { slug: "standard-night-2026-08", email: "asdfghjklqaqlol@gmail.com", playerName: "盧卡斯（測試）", phone: "61230005", paymentStatus: "PAID", userId: true },
  ];

  for (const r of regs) {
    await prisma.tournamentRegistration.upsert({
      where: { tournamentId_email: { tournamentId: tid[r.slug], email: r.email } },
      create: {
        tournamentId: tid[r.slug],
        email: r.email,
        playerName: r.playerName,
        phone: r.phone,
        paymentStatus: r.paymentStatus,
        userId: r.userId ? userIds[r.email] ?? null : null,
      },
      update: { paymentStatus: r.paymentStatus },
    });
  }
  console.log(`✓ 賽事報名 ${regs.length} 筆`);

  // ── 4. Coupons ─────────────────────────────────────────────────────────
  const coupons = [
    { name: "新客九折", code: "NEW10", description: "首次購物全單 9 折", quantity: 50 },
    { name: "滿額減免", code: "SAVE50", description: "消費滿 $500 即減 $50", quantity: 30 },
    { name: "賽事早鳥", code: "EARLY20", description: "賽事報名費 8 折", quantity: 20 },
    { name: "夏日回饋", code: "SUMMER15", description: "指定商品 85 折（已換完）", quantity: 0 },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      create: c,
      update: { ...c, isActive: true },
    });
    console.log(`✓ 優惠券 ${c.name}（${c.code}）× ${c.quantity}`);
  }

  // ── 5. Transactions (replace previous demo rows) ──────────────────────
  const oldDemo = await prisma.transaction.findMany({
    where: { remark: DEMO_REMARK },
    select: { id: true },
  });
  const oldIds = oldDemo.map((t) => t.id);
  if (oldIds.length > 0) {
    await prisma.pointLedger.deleteMany({ where: { referenceId: { in: oldIds } } });
    await prisma.transaction.deleteMany({ where: { id: { in: oldIds } } });
  }

  type TxSeed = {
    type: "ORDER" | "TOURNAMENT";
    buyerType: "USER" | "GUEST";
    email: string;
    customerName: string | null;
    description: string;
    amount: number;
    status: "PAID" | "PENDING" | "FAILED";
    paidAt: Date | null;
    createdAt: Date;
    referenceId?: string; // tournament transactions link the registration below
    regSlug?: string;
    receipt: Record<string, unknown> | null;
  };

  const txs: TxSeed[] = [
    // ── 2026-07（上月報告有數據）──
    {
      type: "ORDER", buyerType: "USER", email: "demo.chan@example.com", customerName: "陳大文",
      description: "網上訂單：強化包 ×5、SAR 特典卡 ×1", amount: 380, status: "PAID",
      paidAt: d("2026-07-05T06:30:00Z"), createdAt: d("2026-07-05T06:28:00Z"),
      receipt: {
        type: "ORDER", orderId: "demo-order-2026-0705-001", email: "demo.chan@example.com",
        items: [
          { name: "強化補充包", condition: "全新", quantity: 5, unitPrice: 60 },
          { name: "SAR 特典卡", condition: "近全新（NM）", quantity: 1, unitPrice: 80 },
        ],
        totalAmount: 380, date: "2026-07-05T14:28:00+08:00",
      },
    },
    {
      type: "ORDER", buyerType: "USER", email: "demo.wong@example.com", customerName: "黃小明",
      description: "網上訂單：禮盒 ×1", amount: 150, status: "PAID",
      paidAt: d("2026-07-12T09:00:00Z"), createdAt: d("2026-07-12T08:58:00Z"),
      receipt: {
        type: "ORDER", orderId: "demo-order-2026-0712-002", email: "demo.wong@example.com",
        items: [{ name: "豪華禮盒", condition: "全新", quantity: 1, unitPrice: 150 }],
        totalAmount: 150, date: "2026-07-12T16:58:00+08:00",
      },
    },
    {
      type: "TOURNAMENT", buyerType: "USER", email: "demo.chan@example.com", customerName: "陳大文",
      description: "賽事報名：夏季商店盃", amount: 120, status: "PAID",
      paidAt: d("2026-07-15T07:10:00Z"), createdAt: d("2026-07-15T07:08:00Z"), regSlug: "summer-cup-2026-07",
      receipt: {
        type: "TOURNAMENT", tournamentTitle: "夏季商店盃", playerName: "陳大文", entryFee: 120,
        startsAt: "2026-07-20T19:00:00+08:00", location: "TCGHK 觀塘工作室", date: "2026-07-15T15:08:00+08:00",
      },
    },
    {
      type: "ORDER", buyerType: "GUEST", email: "guest.ho@example.com", customerName: null,
      description: "網上訂單（訪客）：卡冊 ×2、卡套 ×10", amount: 260, status: "PAID",
      paidAt: d("2026-07-22T10:00:00Z"), createdAt: d("2026-07-22T09:57:00Z"),
      receipt: {
        type: "ORDER", orderId: "demo-order-2026-0722-003", email: "guest.ho@example.com",
        items: [
          { name: "卡冊（9格）", condition: "全新", quantity: 2, unitPrice: 80 },
          { name: "卡套（100入）", condition: "全新", quantity: 1, unitPrice: 100 },
        ],
        totalAmount: 260, date: "2026-07-22T17:57:00+08:00",
      },
    },
    // ── 2026-08（本月報告有數據）──
    {
      type: "TOURNAMENT", buyerType: "USER", email: "demo.chan@example.com", customerName: "陳大文",
      description: "賽事報名：月季冠軍賽（8月）", amount: 150, status: "PAID",
      paidAt: d("2026-08-02T05:00:00Z"), createdAt: d("2026-08-02T04:58:00Z"), regSlug: "monthly-championship-2026-08",
      receipt: {
        type: "TOURNAMENT", tournamentTitle: "月季冠軍賽（8月）", playerName: "陳大文", entryFee: 150,
        startsAt: "2026-08-20T19:00:00+08:00", location: "TCGHK 觀塘工作室", date: "2026-08-02T12:58:00+08:00",
      },
    },
    {
      type: "TOURNAMENT", buyerType: "USER", email: "demo.wong@example.com", customerName: "黃小明",
      description: "賽事報名：月季冠軍賽（8月）", amount: 150, status: "PAID",
      paidAt: d("2026-08-03T06:00:00Z"), createdAt: d("2026-08-03T05:58:00Z"), regSlug: "monthly-championship-2026-08",
      receipt: {
        type: "TOURNAMENT", tournamentTitle: "月季冠軍賽（8月）", playerName: "黃小明", entryFee: 150,
        startsAt: "2026-08-20T19:00:00+08:00", location: "TCGHK 觀塘工作室", date: "2026-08-03T13:58:00+08:00",
      },
    },
    {
      type: "TOURNAMENT", buyerType: "GUEST", email: "guest.lam@example.com", customerName: null,
      description: "賽事報名（訪客）：月季冠軍賽（8月）", amount: 150, status: "PAID",
      paidAt: d("2026-08-04T07:00:00Z"), createdAt: d("2026-08-04T06:58:00Z"), regSlug: "monthly-championship-2026-08",
      receipt: {
        type: "TOURNAMENT", tournamentTitle: "月季冠軍賽（8月）", playerName: "林小姐", entryFee: 150,
        startsAt: "2026-08-20T19:00:00+08:00", location: "TCGHK 觀塘工作室", date: "2026-08-04T14:58:00+08:00",
      },
    },
    {
      type: "ORDER", buyerType: "USER", email: "demo.lee@example.com", customerName: "李嘉豪",
      description: "網上訂單：卡套 ×1、收納盒 ×1", amount: 85, status: "PAID",
      paidAt: d("2026-08-08T08:00:00Z"), createdAt: d("2026-08-08T07:58:00Z"),
      receipt: {
        type: "ORDER", orderId: "demo-order-2026-0808-004", email: "demo.lee@example.com",
        items: [
          { name: "卡套（100入）", condition: "全新", quantity: 1, unitPrice: 35 },
          { name: "收納盒（240卡位）", condition: "全新", quantity: 1, unitPrice: 50 },
        ],
        totalAmount: 85, date: "2026-08-08T15:58:00+08:00",
      },
    },
    {
      type: "ORDER", buyerType: "USER", email: "demo.chan@example.com", customerName: "陳大文",
      description: "網上訂單：補充包 ×2", amount: 95, status: "PAID",
      paidAt: d("2026-08-10T09:00:00Z"), createdAt: d("2026-08-10T08:58:00Z"),
      receipt: {
        type: "ORDER", orderId: "demo-order-2026-0810-005", email: "demo.chan@example.com",
        items: [{ name: "補充包（單包）", condition: "全新", quantity: 2, unitPrice: 47.5 }],
        totalAmount: 95, date: "2026-08-10T16:58:00+08:00",
      },
    },
    {
      type: "TOURNAMENT", buyerType: "USER", email: "demo.cheung@example.com", customerName: "張美琪",
      description: "賽事報名：標準賽制對戰夜", amount: 100, status: "PAID",
      paidAt: d("2026-08-16T05:00:00Z"), createdAt: d("2026-08-16T04:58:00Z"), regSlug: "standard-night-2026-08",
      receipt: {
        type: "TOURNAMENT", tournamentTitle: "標準賽制對戰夜", playerName: "張美琪", entryFee: 100,
        startsAt: "2026-08-26T19:00:00+08:00", location: "TCGHK 觀塘工作室", date: "2026-08-16T12:58:00+08:00",
      },
    },
    {
      type: "TOURNAMENT", buyerType: "USER", email: "asdfghjklqaqlol@gmail.com", customerName: "盧卡斯（測試）",
      description: "賽事報名：標準賽制對戰夜", amount: 100, status: "PAID",
      paidAt: d("2026-08-16T06:00:00Z"), createdAt: d("2026-08-16T05:58:00Z"), regSlug: "standard-night-2026-08",
      receipt: {
        type: "TOURNAMENT", tournamentTitle: "標準賽制對戰夜", playerName: "盧卡斯（測試）", entryFee: 100,
        startsAt: "2026-08-26T19:00:00+08:00", location: "TCGHK 觀塘工作室", date: "2026-08-16T13:58:00+08:00",
      },
    },
    // ── 非成功狀態示範（不計入收入、不產生點數）──
    {
      type: "ORDER", buyerType: "USER", email: "demo.cheung@example.com", customerName: "張美琪",
      description: "網上訂單：禮盒 ×1（待付款）", amount: 120, status: "PENDING",
      paidAt: null, createdAt: d("2026-08-15T02:00:00Z"),
      receipt: null,
    },
    {
      type: "ORDER", buyerType: "GUEST", email: "guest.tsui@example.com", customerName: null,
      description: "網上訂單（訪客）：卡組 ×1（付款失敗）", amount: 330, status: "FAILED",
      paidAt: null, createdAt: d("2026-08-12T03:00:00Z"),
      receipt: null,
    },
  ];

  for (const t of txs) {
    let referenceId = t.referenceId;
    if (t.regSlug) {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { tournamentId_email: { tournamentId: tid[t.regSlug], email: t.email } },
        select: { id: true },
      });
      referenceId = reg?.id ?? referenceId;
    }
    const created = await prisma.transaction.create({
      data: {
        type: t.type,
        referenceId: referenceId ?? `demo-${Math.random().toString(36).slice(2, 10)}`,
        buyerType: t.buyerType,
        email: t.email,
        customerName: t.customerName,
        description: t.description,
        amount: t.amount,
        status: t.status,
        remark: DEMO_REMARK,
        receiptData: t.receipt
          ? (t.receipt as Prisma.InputJsonValue)
          : undefined,
        paidAt: t.paidAt,
        createdAt: t.createdAt,
      },
    });

    // points: 1 pt per $1 on money-received statuses (ADR-004)
    if (t.paidAt && t.status === "PAID") {
      await prisma.pointLedger.create({
        data: {
          email: t.email,
          delta: Math.round(t.amount),
          reason: t.type === "ORDER" ? "ORDER_EARN" : "TOURNAMENT_EARN",
          referenceId: created.id,
          note: t.description,
          createdAt: t.paidAt,
        },
      });
    }
  }
  console.log(`✓ 交易記錄 ${txs.length} 筆（含收據快照）＋ 對應點數`);

  // ── 6. Admin-adjustment points for the test account ───────────────────
  await prisma.pointLedger.deleteMany({ where: { note: DEMO_ADJUST_NOTE } });
  await prisma.pointLedger.create({
    data: {
      email: "asdfghjklqaqlol@gmail.com",
      delta: 30,
      reason: "ADMIN_ADJUST",
      note: DEMO_ADJUST_NOTE,
      createdAt: d("2026-08-01T00:00:00Z"),
    },
  });

  // ── 7. Stock records (ADR-005 demo — denormalized, no variant link yet) ─
  const DEMO_STOCK_NOTE = "示範資料";
  await prisma.stockRecord.deleteMany({ where: { arrivalNote: DEMO_STOCK_NOTE } });

  const stockRecords = [
    // 2026-07 已到貨（計入上月報告支出）
    {
      productName: "強化補充包（盒裝）", variantCondition: "全新", variantIsFoil: false,
      quantity: 1, unitCost: 520, state: "ARRIVED" as const,
      bookedAt: d("2026-07-06T03:00:00Z"), arrivedAt: d("2026-07-10T03:00:00Z"),
    },
    {
      productName: "卡套（100入）", variantCondition: "全新", variantIsFoil: false,
      quantity: 10, unitCost: 28, state: "ARRIVED" as const,
      bookedAt: d("2026-07-11T03:00:00Z"), arrivedAt: d("2026-07-15T03:00:00Z"),
    },
    // 2026-08 已到貨（計入本月報告支出）
    {
      productName: "補充包（單包）", variantCondition: "全新", variantIsFoil: false,
      quantity: 12, unitCost: 35, state: "ARRIVED" as const,
      bookedAt: d("2026-08-01T03:00:00Z"), arrivedAt: d("2026-08-05T03:00:00Z"),
    },
    {
      productName: "卡冊（9格）", variantCondition: "全新", variantIsFoil: false,
      quantity: 5, unitCost: 65, state: "ARRIVED" as const,
      bookedAt: d("2026-08-06T03:00:00Z"), arrivedAt: d("2026-08-10T03:00:00Z"),
    },
    // 待到貨（示範「切換到貨」流程）
    {
      productName: "SAR 特典卡", variantCondition: "近全新（NM）", variantIsFoil: true,
      quantity: 2, unitCost: 150, state: "BOOKED" as const,
      bookedAt: d("2026-08-14T03:00:00Z"), arrivedAt: null,
    },
    {
      productName: "豪華禮盒", variantCondition: "全新", variantIsFoil: false,
      quantity: 6, unitCost: 95, state: "BOOKED" as const,
      bookedAt: d("2026-08-16T03:00:00Z"), arrivedAt: null,
    },
  ];
  for (const s of stockRecords) {
    await prisma.stockRecord.create({
      data: { ...s, variantId: null, arrivalNote: DEMO_STOCK_NOTE },
    });
  }
  console.log(
    `✓ 入貨記錄 ${stockRecords.length} 筆（4 已到貨、2 待到貨）`,
  );

  // ── 8. Summary ─────────────────────────────────────────────────────────
  const balances = await prisma.pointLedger.groupBy({
    by: ["email"],
    _sum: { delta: true },
    where: { email: { in: users.map((u) => u.email) } },
  });
  console.log("\n== 點數結餘 ==");
  for (const b of balances) {
    console.log(`  ${b.email}: ${b._sum.delta ?? 0} 點`);
  }
  console.log("\n✅ 示範資料完成（全部密碼：123456）");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
