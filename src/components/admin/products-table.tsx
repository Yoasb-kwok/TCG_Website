"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { ProductEditDialog } from "@/components/admin/product-edit-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { SEARCH_BAR_SELECT_CLASS } from "@/lib/search-bar-styles";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";
import { PRODUCT_TYPES } from "@/lib/constants";
import { getProductTypeDisplayLabel } from "@/lib/product-type-display";
import { useTaxonomy } from "@/providers/taxonomy-provider";
import type { ProductSort } from "@/lib/types";

export interface AdminProduct {
  id: string;
  name: string;
  type: string;
  description: string | null;
  cardSet: string | null;
  setCode: string | null;
  cardNumber: string | null;
  rarityTier: string | null;
  cardCategory: string | null;
  pokemonType: string | null;
  images: { url: string }[];
  variants: {
    id: string;
    price: number;
    stock: number;
    condition: string;
    isFoil: boolean;
  }[];
}

const PAGE_SIZE = 30;

export function ProductsTable() {
  const { labelFor, optionsFor } = useTaxonomy();
  const setOptions = optionsFor("SET_CODE");
  const rarityOptions = optionsFor("RARITY");
  const productTypeOptions = optionsFor("PRODUCT_TYPE");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [setCodeFilter, setSetCodeFilter] = useState("");
  const [rarityTierFilter, setRarityTierFilter] = useState("");
  const [sort, setSort] = useState<ProductSort>("newest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageToLoad));
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (setCodeFilter) params.set("setCode", setCodeFilter);
      if (rarityTierFilter) params.set("rarityTier", rarityTierFilter);
      if (sort !== "newest") params.set("sort", sort);
      const res = await fetch(`/api/admin/products?${params}`);
      const data = (await res.json()) as {
        products: AdminProduct[];
        total?: number;
        page?: number;
        totalPages?: number;
      };
      const nextTotal = data.total ?? 0;
      const nextTotalPages = Math.max(1, data.totalPages ?? 1);
      const resolvedPage = Math.min(data.page ?? pageToLoad, nextTotalPages);

      setProducts(data.products ?? []);
      setTotal(nextTotal);
      setTotalPages(nextTotalPages);
      if (resolvedPage !== pageToLoad) {
        setPage(resolvedPage);
      }
      setSelected(new Set());
      setLoading(false);
    },
    [search, typeFilter, setCodeFilter, rarityTierFilter, sort],
  );

  useEffect(() => {
    void load(page);
  }, [page, search, typeFilter, setCodeFilter, rarityTierFilter, sort, load]);

  const selectableIds = useMemo(
    () =>
      products
        .filter((p) => p.variants[0])
        .map((p) => p.id),
    [products],
  );

  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.has(id));

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(selectableIds));
    else setSelected(new Set());
  };

  const updateVariant = async (
    productId: string,
    variantId: string,
    field: "price" | "stock",
    value: number,
  ) => {
    await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, [field]: value }),
    });
    load(page);
  };

  const deleteProducts = async (ids: string[]) => {
    if (
      !confirm(
        `確定刪除 ${ids.length} 項商品？此操作無法復原。`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/products/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = (await res.json()) as {
      deleted?: number;
      message?: string;
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "刪除失敗");
      return;
    }
    setMessage(data.message ?? `已刪除 ${data.deleted ?? 0} 項商品`);
    await load(page);
  };

  const applyBulkEdit = async () => {
    const price = bulkPrice.trim() ? Number(bulkPrice) : undefined;
    const stock = bulkStock.trim() ? Number(bulkStock) : undefined;
    if (price == null && stock == null) {
      setMessage("請至少填寫售價或庫存");
      return;
    }
    if (
      (price != null && (Number.isNaN(price) || price < 0)) ||
      (stock != null && (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)))
    ) {
      setMessage("售價或庫存格式不正確");
      return;
    }

    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/products/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: Array.from(selected),
        price,
        stock,
      }),
    });
    const data = (await res.json()) as {
      updated?: number;
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "更新失敗");
      return;
    }
    setBulkOpen(false);
    setBulkPrice("");
    setBulkStock("");
    setMessage(`已更新 ${data.updated ?? 0} 項商品`);
    await load(page);
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const typeLabel = (t: string) => getProductTypeDisplayLabel(t, labelFor);

  const selectedCount = selected.size;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="搜尋商品..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className={SEARCH_BAR_SELECT_CLASS}
        >
          <option value="">全部類型</option>
          {(productTypeOptions.length > 0
            ? productTypeOptions
            : PRODUCT_TYPES.map((t) => ({
                id: t.value,
                value: t.value,
                label: t.label,
              }))
          ).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={setCodeFilter}
          onChange={(e) => {
            setSetCodeFilter(e.target.value);
            setPage(1);
          }}
          className={SEARCH_BAR_SELECT_CLASS}
        >
          <option value="">全部系列編號</option>
          {setOptions.map((s) => (
            <option key={s.id} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={rarityTierFilter}
          onChange={(e) => {
            setRarityTierFilter(e.target.value);
            setPage(1);
          }}
          className={SEARCH_BAR_SELECT_CLASS}
        >
          <option value="">全部稀有度</option>
          {rarityOptions.map((r) => (
            <option key={r.id} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as ProductSort);
            setPage(1);
          }}
          className={SEARCH_BAR_SELECT_CLASS}
        >
          <option value="newest">最新上架</option>
          <option value="setCode">系列編號排序</option>
          <option value="rarityTier">稀有度排序</option>
        </select>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-pink-500/30 bg-pink-500/10 px-4 py-3">
          <span className="text-sm text-foreground">
            已選 <strong>{selectedCount}</strong> 項
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => setBulkOpen(true)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            批次編輯
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => deleteProducts(Array.from(selected))}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            批次刪除
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setSelected(new Set())}
          >
            取消選取
          </Button>
        </div>
      )}

      {message && (
        <p className="text-sm text-amber-400/90">{message}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card text-left text-muted-foreground">
            <tr>
              <th className="w-10 p-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  aria-label="全選"
                />
              </th>
              <th className="p-3">商品</th>
              <th className="p-3">系列</th>
              <th className="p-3">稀有度</th>
              <th className="p-3">類型</th>
              <th className="p-3">售價</th>
              <th className="p-3">庫存</th>
              <th className="p-3 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const v = p.variants[0];
              if (!v) return null;
              const isSelected = selected.has(p.id);
              return (
                <tr
                  key={p.id}
                  className={`border-b border-border ${
                    isSelected ? "bg-pink-500/5" : ""
                  }`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        toggleOne(p.id, checked === true)
                      }
                      aria-label={`選取 ${p.name}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.images[0] && (
                        <div className="relative h-12 w-9 shrink-0">
                          <Image
                            src={p.images[0].url}
                            alt={p.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground/80">
                          {p.cardSet ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {p.setCode ? labelFor("SET_CODE", p.setCode) : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {p.rarityTier ? labelFor("RARITY", p.rarityTier) : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{typeLabel(p.type)}</td>
                  <td className="p-3">
                    <Input
                      type="number"
                      defaultValue={v.price}
                      className="h-8 w-24 border-border bg-background text-foreground"
                      onBlur={(e) =>
                        updateVariant(p.id, v.id, "price", Number(e.target.value))
                      }
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      defaultValue={v.stock}
                      className={`h-8 w-16 border-border bg-background text-foreground ${
                        v.stock <= 2 ? "border-amber-500/50" : ""
                      }`}
                      onBlur={(e) =>
                        updateVariant(p.id, v.id, "stock", Number(e.target.value))
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditProduct(p);
                          setEditOpen(true);
                        }}
                        className="rounded p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground"
                        title="編輯商品"
                        aria-label="編輯商品"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProducts([p.id])}
                        className="rounded p-1 text-muted-foreground/80 hover:text-red-400"
                        title="刪除此商品"
                        aria-label="刪除此商品"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && products.length === 0 && (
          <p className="p-8 text-center text-muted-foreground/80">
            尚無商品，請使用上方工具上架
          </p>
        )}
        {loading && (
          <p className="p-8 text-center text-muted-foreground/80">載入中...</p>
        )}
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            顯示 {rangeStart}–{rangeEnd}，共 {total} 項
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading || busy}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              上一頁
            </Button>
            <span className="min-w-[5rem] text-center text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              下一頁
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductEditDialog
        product={editProduct}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditProduct(null);
        }}
        onSaved={() => {
          setMessage("已儲存商品");
          void load(page);
        }}
      />

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批次編輯</DialogTitle>
            <DialogDescription>
              將統一套用至已選的 {selectedCount} 項商品（空白欄位不會變更）
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void applyBulkEdit();
            }}
          >
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="bulk-price">售價 (HKD)</Label>
                <Input
                  id="bulk-price"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="留空則不變更"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  className="border-border bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-stock">庫存</Label>
                <Input
                  id="bulk-stock"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="留空則不變更"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  className="border-border bg-background"
                />
              </div>
              {selectedCount > 0 && bulkPrice && (
                <p className="text-xs text-muted-foreground">
                  預覽：售價將設為 {formatPrice(Number(bulkPrice))}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkOpen(false)}
                disabled={busy}
              >
                取消
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "更新中..." : "套用"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
