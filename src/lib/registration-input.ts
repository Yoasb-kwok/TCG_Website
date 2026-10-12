import type { RegistrationInput } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("852") && digits.length === 11) digits = digits.slice(3);
  if (!/^\d{8}$/.test(digits)) return null;
  return digits;
}

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

export type ParsedRegistration =
  | { ok: true; value: RegistrationInput }
  | { ok: false; error: string; status: 400 };

export function parseRegistrationInput(input: {
  playerName?: string | null;
  email?: string | null;
  phone?: string | null;
}): ParsedRegistration {
  const playerName = (input.playerName ?? "").trim();
  if (!playerName) return { ok: false, error: "請輸入姓名", status: 400 };
  if (playerName.length > 40) return { ok: false, error: "姓名不可超過 40 字", status: 400 };

  const rawEmail = (input.email ?? "").trim();
  if (!rawEmail) return { ok: false, error: "請輸入電郵", status: 400 };
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "電郵格式不正確", status: 400 };

  const rawPhone = (input.phone ?? "").trim();
  if (!rawPhone) return { ok: false, error: "請輸入電話號碼", status: 400 };
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "電話號碼必須為 8 位數字", status: 400 };

  return { ok: true, value: { playerName, email, phone } };
}

type ExistingRegistration = { email?: string | null; phone: string };

export function registrationConflict(
  existing: ExistingRegistration[],
  next: Pick<RegistrationInput, "email" | "phone">,
  maxPlayers: number,
): { error: string; status: number } | null {
  if (existing.length >= maxPlayers) {
    return { error: "名額已滿", status: 400 };
  }
  if (existing.some((row) => (row.email ?? "").trim().toLowerCase() === next.email)) {
    return { error: "此電郵已報名此賽事", status: 409 };
  }
  if (existing.some((row) => row.phone === next.phone)) {
    return { error: "此電話號碼已報名此賽事", status: 409 };
  }
  return null;
}

export function registrationClosedLabel(
  tournament: {
    status: string;
    registrationDeadline: string;
    registeredCount: number;
    maxPlayers: number;
  },
  now = new Date(),
): string | null {
  const spotsLeft = tournament.maxPlayers - tournament.registeredCount;
  if (tournament.status === "CANCELLED") return "賽事已取消";
  if (tournament.status === "COMPLETED") return "賽事已結束";
  if (spotsLeft <= 0 || tournament.status === "FULL") return "名額已滿";
  if (tournament.status !== "OPEN") return "此賽事已不再接受報名";
  const deadline = new Date(tournament.registrationDeadline).getTime();
  if (Number.isNaN(deadline) || deadline <= now.getTime()) return "報名已截止";
  return null;
}

export function decodeRouteSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}
