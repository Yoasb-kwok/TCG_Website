import { randomInt } from "node:crypto";
import { hash, compare } from "bcryptjs";

/** OTP 驗證碼長度（6位數） */
export const OTP_LENGTH = 6;

/** OTP 有效期限：10 分鐘 */
export const OTP_EXPIRY_MS = 10 * 60 * 1000;

/** 最大驗證嘗試次數 */
export const OTP_MAX_ATTEMPTS = 5;

/**
 * 使用 crypto.randomInt 產生密碼學安全的 6 位數 OTP。
 * 範圍：000000–999999
 */
export function generateOtp(): string {
  const num = randomInt(0, 1_000_000);
  return num.toString().padStart(OTP_LENGTH, "0");
}

/**
 * 使用 bcrypt 雜湊 OTP 驗證碼。
 * 明碼永遠不會存入資料庫。
 */
export async function hashOtp(code: string): Promise<string> {
  return hash(code, 10);
}

/**
 * 驗證 OTP 驗證碼是否符合雜湊值。
 */
export async function verifyOtp(
  code: string,
  hashed: string,
): Promise<boolean> {
  if (!code) return false;
  return compare(code, hashed);
}

/**
 * 檢查過期時間是否已到。
 */
export function isExpired(expiresAt: Date): boolean {
  return Date.now() >= expiresAt.getTime();
}
