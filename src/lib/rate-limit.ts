/**
 * 簡易記憶體速率限制工具。
 *
 * 用於 OTP 發送端點的濫用防護：
 * - checkCooldown: 同一 key（如 email）的最短間隔（例如 60 秒）
 * - checkRateLimit: 同一 key（如 IP）在時間窗口內的最大次數（例如 10 分鐘 5 次）
 *
 * 注意：這是單一實例的記憶體限制。伺服器重啟後狀態會重置。
 * 對於小型商店足夠；未來可升級為 Redis。
 */

interface CooldownEntry {
  lastAttempt: number;
}

const cooldownStore = new Map<string, CooldownEntry>();

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/** 清除過期項目，防止 Map 無限增長 */
function cleanupExpired(
  store: Map<string, unknown>,
  maxAgeMs: number,
): void {
  const now = Date.now();
  for (const [key, value] of store) {
    if (value && typeof value === "object" && "lastAttempt" in value) {
      if (now - (value as CooldownEntry).lastAttempt > maxAgeMs) {
        store.delete(key);
      }
    }
  }
}

/**
 * 檢查冷卻時間：同一 key 是否已過了冷卻期。
 *
 * @returns allowed = true 表示可以繼續，retryAfterMs = 0
 *          allowed = false 表示被擋，retryAfterMs = 剩餘等待毫秒
 */
export function checkCooldown(
  key: string,
  opts: { cooldownMs: number },
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = cooldownStore.get(key);

  if (entry && now - entry.lastAttempt < opts.cooldownMs) {
    const retryAfterMs = opts.cooldownMs - (now - entry.lastAttempt);
    return { allowed: false, retryAfterMs };
  }

  cooldownStore.set(key, { lastAttempt: now });

  // 延遲清理：每 1000 次呼叫清理一次
  if (cooldownStore.size > 1000) {
    cleanupExpired(cooldownStore, opts.cooldownMs * 2);
  }

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * 檢查滑動窗口速率限制：同一 key 在 windowMs 內不超過 max 次。
 *
 * @returns allowed = true 表示可以繼續
 *          allowed = false 表示超過限制，retryAfterMs = 窗口重置剩餘毫秒
 */
export function checkRateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Filter to only timestamps within the current window
  const recent = entry
    ? entry.timestamps.filter((ts) => now - ts < opts.windowMs)
    : [];

  if (recent.length >= opts.max) {
    const oldestInWindow = recent[0];
    const retryAfterMs = opts.windowMs - (now - oldestInWindow);
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  recent.push(now);
  rateLimitStore.set(key, { timestamps: recent });

  // 延遲清理
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore) {
      const valid = v.timestamps.filter(
        (ts) => now - ts < opts.windowMs,
      );
      if (valid.length === 0) {
        rateLimitStore.delete(k);
      } else {
        rateLimitStore.set(k, { timestamps: valid });
      }
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}
