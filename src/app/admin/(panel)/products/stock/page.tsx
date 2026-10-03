"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

interface VariantOption {
  id: string;
  productId: string;
  name: string;
  condition: string;
  isFoil: boolean;
}

export default function StockEntryPage() {
  const router = useRouter();
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadVariants = useCallback(async () => {
    setLoadingVariants(true);
    try {
      const res = await fetch("/api/admin/inventory?pageSize=9999");
      const data = await res.json();
      const list: VariantOption[] = (data.variants ?? []).map(
        (v: {
          id: string;
          productId: string;
          name: string;
          condition: string;
          isFoil: boolean;
        }) => ({
          id: v.id,
          productId: v.productId,
          name: v.name,
          condition: v.condition,
          isFoil: v.isFoil,
        }),
      );
      setVariants(list);
    } catch {
      setError("載入商品清單失敗");
    } finally {
      setLoadingVariants(false);
    }
  }, []);

  useEffect(() => {
    void loadVariants();
  }, [loadVariants]);

  const handleSubmit = async () => {
    if (!variantId) {
      setError("請選擇商品");
      return;
    }
    const qty = Number(quantity);
    const cost = Number(unitCost);
    if (!qty || qty <= 0) {
      setError("數量必須大於 0");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setError("單價必須為有效數字");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          quantity: qty,
          unitCost: cost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "入貨失敗");

      setSuccess(true);
      // Redirect back to inventory after short delay
      setTimeout(() => router.push("/admin/products"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "入貨失敗");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => router.push("/admin/products")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回庫存管理
      </button>

      <h1 className="text-2xl font-bold">入貨</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        選擇商品並輸入入貨數量和成本價。入貨後數量會加入「入貨中」，確認到貨後才轉為「實際庫存」。
      </p>

      {success ? (
        <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
          <p className="text-lg font-medium text-green-600">入貨成功！</p>
          <p className="mt-1 text-sm text-muted-foreground">正在返回庫存管理…</p>
        </div>
      ) : (
        <form
          className="mt-6 max-w-lg space-y-4 rounded-xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          {/* Variant selector */}
          <div>
            <label className="text-sm font-medium">商品 *</label>
            {loadingVariants ? (
              <p className="mt-1 text-sm text-muted-foreground">載入中…</p>
            ) : (
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">— 選擇商品 —</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}（{v.condition}
                    {v.isFoil ? " · 閃卡" : ""}）
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium">入貨數量 *</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Unit cost */}
          <div>
            <label className="text-sm font-medium">
              成本單價 (HKD) *
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              供應商進貨成本，非售價。用於利潤計算參考。
            </p>
            <input
              type="number"
              min={0}
              step={0.1}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="例如：5.0"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !variantId}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2 text-sm text-background disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "處理中…" : "確認入貨"}
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
