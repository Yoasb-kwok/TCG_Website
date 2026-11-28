export interface RecycleListingInput {
  productId: string;
  quantity: number;
  price: number;
  active: boolean;
}

export function parseRecycleListings(
  raw: unknown,
): { ok: true; listings: RecycleListingInput[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "回收清單格式不正確" };
  if (raw.length > 200) return { ok: false, error: "回收清單過多" };

  const listings: RecycleListingInput[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return { ok: false, error: "回收項目不正確" };
    const row = item as Record<string, unknown>;
    const productId = typeof row.productId === "string" ? row.productId.trim() : "";
    if (!productId) return { ok: false, error: "請選擇單卡" };
    if (seen.has(productId)) return { ok: false, error: "同一張卡只可設定一次" };
    seen.add(productId);

    const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
    const price = typeof row.price === "number" ? row.price : Number(row.price);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
      return { ok: false, error: "回收數量須為 1 至 9999 的整數" };
    }
    if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
      return { ok: false, error: "回收價不正確" };
    }
    listings.push({
      productId,
      quantity,
      price,
      active: row.active !== false,
    });
  }
  return { ok: true, listings };
}
