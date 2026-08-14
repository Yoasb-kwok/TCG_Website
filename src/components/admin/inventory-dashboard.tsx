"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Trash2, Settings, Plus } from "lucide-react";

interface InventoryVariant {
  id: string;
  productId: string;
  name: string;
  condition: string;
  isFoil: boolean;
  actual: number;
  booked: number;
  reserved: number;
  total: number;
  reservedNote: string | null;
  lowThreshold: number | null;
  criticalThreshold: number | null;
  effectiveLow: number;
  effectiveCritical: number;
  state: "healthy" | "low" | "critical";
}

interface ReserveDialogProps {
  variant: InventoryVariant;
  onClose: () => void;
  onSave: (quantity: number, note: string) => void;
}

function ReserveDialog({ variant, onClose, onSave }: ReserveDialogProps) {
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="預留庫存"
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">
          預留庫存 — {variant.name} ({variant.condition})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          可預留：實際 {variant.actual} + 入貨中 {variant.booked}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">預留數量</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">備註（可選）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：客人預留、比賽用"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(Number(qty), note)}
            className="rounded-lg bg-foreground px-4 py-2 text-sm text-background"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}

interface ThresholdDialogProps {
  variant: InventoryVariant;
  globalLow: number;
  globalCritical: number;
  onClose: () => void;
  onSave: (low: number | null, critical: number | null) => void;
}

function ThresholdDialog({
  variant,
  globalLow,
  globalCritical,
  onClose,
  onSave,
}: ThresholdDialogProps) {
  const [low, setLow] = useState(
    variant.lowThreshold?.toString() ?? "",
  );
  const [critical, setCritical] = useState(
    variant.criticalThreshold?.toString() ?? "",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="庫存設定"
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">庫存水位設定</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          系統會為門市客人保留緩衝庫存。線上客人只能購買「實際數量 − 臨界水位」的商品。
          當實際數量 ≤ 臨界水位時，商品會從線上商店隱藏。
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">
              低水位（留空使用全局預設：{globalLow}）
            </label>
            <input
              type="number"
              min={0}
              value={low}
              onChange={(e) => setLow(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              臨界水位（留空使用全局預設：{globalCritical}）
            </label>
            <input
              type="number"
              min={0}
              value={critical}
              onChange={(e) => setCritical(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() =>
              onSave(
                low.trim() ? Number(low) : null,
                critical.trim() ? Number(critical) : null,
              )
            }
            className="rounded-lg bg-foreground px-4 py-2 text-sm text-background"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}

const STATE_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600",
  low: "bg-amber-500/10 text-amber-600",
  healthy: "bg-green-500/10 text-green-600",
};

const STATE_LABELS: Record<string, string> = {
  critical: "臨界",
  low: "低存貨",
  healthy: "充足",
};

export function InventoryDashboard() {
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [globalLow, setGlobalLow] = useState(5);
  const [globalCritical, setGlobalCritical] = useState(2);
  const [reserveTarget, setReserveTarget] = useState<InventoryVariant | null>(null);
  const [thresholdTarget, setThresholdTarget] = useState<InventoryVariant | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stateFilter) params.set("state", stateFilter);

    try {
      const res = await fetch(`/api/admin/inventory?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "載入失敗");
      }
      const data = await res.json();
      setVariants(data.variants ?? []);
      if (data.globalDefaults) {
        setGlobalLow(data.globalDefaults.low);
        setGlobalCritical(data.globalDefaults.critical);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }, [search, stateFilter]);

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [load]);

  const adjust = async (
    variantId: string,
    action: string,
    quantity?: number,
    note?: string,
  ) => {
    const body: Record<string, unknown> = { action };
    if (quantity !== undefined) body.quantity = quantity;
    if (note !== undefined) body.note = note;

    await fetch(`/api/admin/inventory/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  };

  const saveThresholds = async (low: number | null, critical: number | null) => {
    if (!thresholdTarget) return;
    // Use the PATCH endpoint on the product variant directly
    // For now, we use the inventory PATCH with a custom action
    // This would need a dedicated threshold endpoint or extend the PATCH
    // Using the prisma client directly via a new endpoint pattern
    await fetch(`/api/admin/products/${thresholdTarget.productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: thresholdTarget.id,
        lowThreshold: low,
        criticalThreshold: critical,
      }),
    });
    setThresholdTarget(null);
    await load();
  };

  const deleteProduct = async (productId: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？此操作無法復原。`)) return;
    await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    await load();
  };

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜尋商品名稱…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">全部狀態</option>
          <option value="critical">臨界</option>
          <option value="low">低存貨</option>
          <option value="healthy">充足</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-2 py-2">商品</th>
              <th className="px-2 py-2 text-center">實際</th>
              <th className="px-2 py-2 text-center">入貨中</th>
              <th className="px-2 py-2 text-center">預留</th>
              <th className="px-2 py-2 text-center">總計</th>
              <th className="px-2 py-2 text-center">狀態</th>
              <th className="px-2 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : variants.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  暫無庫存資料
                </td>
              </tr>
            ) : (
              variants.map((v) => (
                <tr key={v.id} className="border-b border-border/50">
                  <td className="px-2 py-3">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.condition}{v.isFoil ? " · 閃卡" : ""}
                    </div>
                    {v.reservedNote && (
                      <div className="text-xs text-amber-600">📝 {v.reservedNote}</div>
                    )}
                  </td>

                  {/* Actual — fill-in input */}
                  <td className="px-2 py-3 text-center">
                    <input
                      type="number"
                      min={0}
                      defaultValue={v.actual}
                      key={v.actual}
                      className={`h-8 w-16 rounded border border-border bg-background px-2 text-center text-sm font-medium ${
                        v.actual <= v.effectiveCritical ? "border-red-500/50" : v.actual <= v.effectiveLow ? "border-amber-500/50" : ""
                      }`}
                      onBlur={(e) => {
                        const newVal = Math.max(0, Number(e.target.value));
                        const delta = newVal - v.actual;
                        if (delta > 0) adjust(v.id, "increase", delta);
                        else if (delta < 0) adjust(v.id, "decrease", -delta);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </td>

                  {/* Booked with stock button */}
                  <td className="px-2 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <span className="w-8 text-center">{v.booked}</span>
                      <a href="/admin/products/stock">
                        <button type="button" className="rounded p-0.5 hover:bg-muted" title="入貨">
                          <Plus className="h-4 w-4" />
                        </button>
                      </a>
                    </div>
                  </td>

                  {/* Reserved with reserve/clear buttons */}
                  <td className="px-2 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <span className="w-8 text-center">{v.reserved}</span>
                      <button
                        type="button"
                        onClick={() => setReserveTarget(v)}
                        className="rounded p-0.5 hover:bg-muted"
                        title="預留"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      {v.reserved > 0 && (
                        <button
                          type="button"
                          onClick={() => adjust(v.id, "clearReserved")}
                          className="text-xs text-muted-foreground hover:text-foreground"
                          title="清除預留"
                        >
                          清除
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-2 py-3 text-center font-medium">{v.total}</td>

                  {/* State badge */}
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setThresholdTarget(v)}
                      title="點擊設定水位"
                    >
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${STATE_STYLES[v.state]}`}
                      >
                        {STATE_LABELS[v.state]}
                        <Settings className="h-3 w-3" />
                      </span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => deleteProduct(v.productId, v.name)}
                      className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                      title="刪除商品"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      {reserveTarget && (
        <ReserveDialog
          variant={reserveTarget}
          onClose={() => setReserveTarget(null)}
          onSave={(qty, note) => {
            adjust(reserveTarget.id, "reserve", qty, note);
            setReserveTarget(null);
          }}
        />
      )}

      {thresholdTarget && (
        <ThresholdDialog
          variant={thresholdTarget}
          globalLow={globalLow}
          globalCritical={globalCritical}
          onClose={() => setThresholdTarget(null)}
          onSave={saveThresholds}
        />
      )}
    </div>
  );
}
