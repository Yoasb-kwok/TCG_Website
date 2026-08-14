"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, CheckCircle2, Truck } from "lucide-react";

interface StockRecordItem {
  id: string;
  variantId: string | null;
  quantity: number;
  unitCost: number;
  state: "BOOKED" | "ARRIVED";
  bookedAt: string;
  arrivedAt: string | null;
  arrivalNote: string | null;
  productName: string;
  variantCondition: string;
  variantIsFoil: boolean;
  variant: {
    id: string;
    condition: string;
    isFoil: boolean;
    product: { id: string; name: string };
  } | null;
}

interface ArrivalDialogProps {
  record: StockRecordItem;
  onClose: () => void;
  onConfirm: (arrivedAt: string, note: string) => void;
}

function ArrivalDialog({ record, onClose, onConfirm }: ArrivalDialogProps) {
  // Default arrival time = now, formatted for datetime-local input
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [arrivedAt, setArrivedAt] = useState(localISO);
  const [note, setNote] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="確認到貨"
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">確認到貨</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {record.variant?.product.name ?? record.productName}（{record.variant?.condition ?? record.variantCondition}
          {(record.variant?.isFoil ?? record.variantIsFoil) ? " · 閃卡" : ""}）· {record.quantity} 件
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">到貨時間 *</label>
            <input
              type="datetime-local"
              required
              value={arrivedAt}
              onChange={(e) => setArrivedAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">備註（可選）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：有包裝損壞"
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
            onClick={() => onConfirm(arrivedAt, note)}
            disabled={!arrivedAt}
            className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
          >
            確認到貨
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecordDashboard() {
  const [records, setRecords] = useState<StockRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [arrivalTarget, setArrivalTarget] = useState<StockRecordItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stateFilter) params.set("state", stateFilter);
    params.set("page", String(page));

    try {
      const res = await fetch(`/api/admin/stock-records?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "載入失敗");
      }
      const data = await res.json();
      setRecords(data.records ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [search, stateFilter, page]);

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [load]);

  const confirmArrival = async (arrivedAt: string, note: string) => {
    if (!arrivalTarget) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/stock-records/${arrivalTarget.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            arrivedAt: new Date(arrivedAt).toISOString(),
            note: note || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "操作失敗");
      }
      setArrivalTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失敗");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜尋商品名稱…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">全部狀態</option>
          <option value="BOOKED">運送中</option>
          <option value="ARRIVED">已抵達</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-2 py-2">商品</th>
              <th className="px-2 py-2 text-center">數量</th>
              <th className="px-2 py-2 text-center">總價</th>
              <th className="px-2 py-2 text-center">入貨時間</th>
              <th className="px-2 py-2 text-center">狀態</th>
              <th className="px-2 py-2 text-center">到貨時間</th>
              <th className="px-2 py-2 text-center">備註</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  暫無入貨記錄
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  {/* Product name + variant detail */}
                  <td className="px-2 py-3">
                    <div className="font-medium">
                      {r.variant?.product.name ?? r.productName}
                      {!r.variant && (
                        <span className="ml-2 text-xs text-red-500">（已刪除）</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.variant?.condition ?? r.variantCondition}
                      {(r.variant?.isFoil ?? r.variantIsFoil) ? " · 閃卡" : ""}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="px-2 py-3 text-center font-medium">{r.quantity}</td>

                  {/* Total cost = unit cost × quantity */}
                  <td className="px-2 py-3 text-center">HK${(r.unitCost * r.quantity).toFixed(2)}</td>

                  {/* Booked at */}
                  <td className="px-2 py-3 text-center text-muted-foreground">
                    {formatDate(r.bookedAt)}
                  </td>

                  {/* State toggle */}
                  <td className="px-2 py-3 text-center">
                    {r.state === "ARRIVED" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        抵達
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setArrivalTarget(r)}
                        className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 transition hover:bg-amber-500/20"
                      >
                        <Truck className="h-3 w-3" />
                        運送中 · 點擊確認到貨
                      </button>
                    )}
                  </td>

                  {/* Arrived at */}
                  <td className="px-2 py-3 text-center text-muted-foreground">
                    {formatDate(r.arrivedAt)}
                  </td>

                  {/* Note */}
                  <td className="px-2 py-3 text-center text-muted-foreground">
                    {r.arrivalNote ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            上一頁
          </button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 頁
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            下一頁
          </button>
        </div>
      )}

      {/* Arrival dialog */}
      {arrivalTarget && (
        <ArrivalDialog
          record={arrivalTarget}
          onClose={() => setArrivalTarget(null)}
          onConfirm={confirmArrival}
        />
      )}

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-lg bg-card px-6 py-4 text-sm shadow-lg">
            處理中…
          </div>
        </div>
      )}
    </div>
  );
}
