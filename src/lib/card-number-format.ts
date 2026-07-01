/** 格式化單張卡號：001/063 */
export function formatCardNumber(
  num: number,
  suffix: string,
  padWidth = 3,
): string {
  const n = Math.max(0, Math.floor(num));
  const padded = String(n).padStart(padWidth, "0");
  const cleanSuffix = suffix.replace(/^\//, "").trim();
  return `${padded}/${cleanSuffix}`;
}

/** 依最小～最大編號產生卡號列表 */
export function generateCardNumberRange(
  min: number,
  max: number,
  suffix: string,
  padWidth = 3,
): { value: string; label: string }[] {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const width = Math.max(padWidth, String(hi).length);
  const out: { value: string; label: string }[] = [];
  for (let i = lo; i <= hi; i++) {
    const value = formatCardNumber(i, suffix, width);
    out.push({ value, label: `#${value}` });
  }
  return out;
}

/** 從完整卡號解析編號部分（001/063 → 1） */
export function parseCardNumberIndex(cardNumber: string): number | null {
  const m = cardNumber.trim().match(/^(\d+)\//);
  if (!m) return null;
  return Number.parseInt(m[1], 10);
}

/** 保留卡號前綴，替換 / 後的系列後綴（001/080 + 083 → 001/083） */
export function replaceCardNumberSuffix(
  cardNumber: string,
  newSuffix: string,
): string | null {
  const m = cardNumber.trim().match(/^(\d+)\/\d+$/);
  if (!m) return null;
  const cleanSuffix = newSuffix.replace(/^\//, "").trim();
  if (!cleanSuffix) return null;
  return `${m[1]}/${cleanSuffix}`;
}

export function cardNumberLabel(cardNumber: string): string {
  return `#${cardNumber}`;
}
