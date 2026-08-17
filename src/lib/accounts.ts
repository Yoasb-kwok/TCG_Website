import { stringify } from "csv-stringify/sync";
import { getPrisma } from "@/lib/prisma";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  isExpired,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
} from "@/lib/otp";

/** ADR-008: Admin account management domain layer */

export interface AccountRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  deletedAt: Date | null;
  createdAt: Date;
  pendingEmailChange: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ListAccountsOptions {
  q?: string;
  sort?: "newest" | "oldest";
  includeDeleted?: boolean;
}

export async function listAccounts(
  opts: ListAccountsOptions = {},
): Promise<AccountRow[]> {
  const prisma = getPrisma();

  const where: Record<string, unknown> = {};
  if (!opts.includeDeleted) where.deletedAt = null;

  const q = opts.q?.trim();
  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: opts.sort === "oldest" ? "asc" : "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  const pending = await prisma.emailChangeRequest.findMany({
    where: { status: "PENDING" },
    select: { userId: true },
  });
  const pendingSet = new Set(pending.map((p) => p.userId));

  return users.map((u) => ({
    ...u,
    role: u.role as string,
    pendingEmailChange: pendingSet.has(u.id),
  }));
}

export async function updateProfile(
  id: string,
  input: { name?: string; phone?: string },
) {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new Error("用戶不存在");

  const data: Record<string, string | null> = {};
  if (input.name !== undefined) data.name = input.name.trim() || null;
  if (input.phone !== undefined) data.phone = input.phone.trim() || null;

  return prisma.user.update({ where: { id }, data });
}

/**
 * ADR-008 Decision 2 — State 1.
 * Flips User.email to the new email immediately; the old email is preserved
 * in the request row for reversal. Unique constraint catches collisions.
 */
export async function initiateEmailChange(userId: string, newEmail: string) {
  const prisma = getPrisma();
  const email = newEmail.trim().toLowerCase();

  if (!email) throw new Error("請填寫電郵");
  if (!EMAIL_RE.test(email)) throw new Error("電郵格式不正確");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("用戶不存在");
  if (user.deletedAt) throw new Error("此帳號已刪除，無法變更電郵");
  if (user.email === email) throw new Error("新電郵不可與目前電郵相同");

  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash) throw new Error("此電郵已被其他帳號使用");

  const existing = await prisma.emailChangeRequest.findUnique({
    where: { userId },
  });
  if (existing?.status === "PENDING") {
    throw new Error("此帳號已有進行中的電郵變更");
  }

  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { email } });
    return tx.emailChangeRequest.upsert({
      where: { userId },
      create: {
        userId,
        oldEmail: user.email,
        newEmail: email,
        status: "PENDING",
      },
      update: {
        oldEmail: user.email,
        newEmail: email,
        otpHash: null,
        attempts: 0,
        expiresAt: null,
        status: "PENDING",
        confirmedAt: null,
      },
    });
  });
}

/**
 * ADR-008 Decision 2 — Reverse (admin undo during PENDING).
 * Restores User.email to oldEmail and marks the request REVERSED.
 */
export async function reverseEmailChange(userId: string) {
  const prisma = getPrisma();
  const req = await prisma.emailChangeRequest.findUnique({ where: { userId } });
  if (!req || req.status !== "PENDING") {
    throw new Error("沒有進行中的電郵變更");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { email: req.oldEmail },
    });
    await tx.emailChangeRequest.update({
      where: { userId },
      data: { status: "REVERSED" },
    });
    return user;
  });
}

/**
 * ADR-008 Decision 4 — State 2 (OTP generated at login/verify-page load).
 * Regeneration resets attempts (same semantics as PasswordReset upsert).
 * Returns the plaintext code so the calling route can email it.
 */
export async function issueEmailChangeOtp(
  userId: string,
): Promise<{ code: string; newEmail: string }> {
  const prisma = getPrisma();
  const req = await prisma.emailChangeRequest.findUnique({ where: { userId } });
  if (!req || req.status !== "PENDING") {
    throw new Error("沒有進行中的電郵變更");
  }

  const code = generateOtp();
  const otpHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.emailChangeRequest.update({
    where: { userId },
    data: { otpHash, attempts: 0, expiresAt },
  });

  return { code, newEmail: req.newEmail };
}

/**
 * ADR-008 Decisions 4–5 — State 3.
 * Correct OTP → CONFIRMED + PointLedger rows moved old→new (merged if the
 * new email already has guest points — ADR-004 semantics).
 */
export async function verifyEmailChangeOtp(userId: string, code: string) {
  const prisma = getPrisma();
  const req = await prisma.emailChangeRequest.findUnique({ where: { userId } });
  if (!req || req.status !== "PENDING") {
    throw new Error("沒有進行中的電郵變更");
  }
  if (!req.otpHash) throw new Error("請先請求驗證碼");
  if (req.attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error("嘗試次數過多，請聯絡管理員還原電郵變更");
  }
  if (req.expiresAt && isExpired(req.expiresAt)) {
    throw new Error("驗證碼已過期，請重新發送");
  }

  const ok = await verifyOtp(code, req.otpHash);
  if (!ok) {
    await prisma.emailChangeRequest.update({
      where: { userId },
      data: { attempts: req.attempts + 1 },
    });
    throw new Error("驗證碼錯誤");
  }

  return prisma.$transaction(async (tx) => {
    await tx.emailChangeRequest.update({
      where: { userId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    await tx.pointLedger.updateMany({
      where: { email: req.oldEmail },
      data: { email: req.newEmail },
    });
    return tx.user.findUnique({ where: { id: userId } });
  });
}

/** ADR-008 Decision 3 — password reset is blocked while a change is pending. */
export async function hasPendingEmailChange(email: string): Promise<boolean> {
  const prisma = getPrisma();
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (!user) return false;

  const req = await prisma.emailChangeRequest.findUnique({
    where: { userId: user.id },
  });
  return req?.status === "PENDING";
}

/** ADR-008 Decision 7 — soft delete; email stays occupied. */
export async function softDeleteAccount(userId: string) {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("用戶不存在");

  return prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
}

export async function undeleteAccount(userId: string) {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("用戶不存在");

  return prisma.user.update({
    where: { id: userId },
    data: { deletedAt: null },
  });
}

/** ADR-008 Decision 8 — CSV columns: id, name, email, phone, createdAt. */
export async function exportAccountsCsv(ids: string[]): Promise<string> {
  if (ids.length === 0) return "";

  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    phone: u.phone ?? "",
    createdAt: u.createdAt.toISOString(),
  }));

  return stringify(rows, {
    header: true,
    columns: ["id", "name", "email", "phone", "createdAt"],
  });
}
