"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";

interface RecycleDraft {
  productId: string;
  name: string;
  imageUrl: string | null;
  quantity: string;
  price: string;
  active: boolean;
}

interface SearchHit {
  id: string;
  name: string;
  type: string;
  images?: { url: string }[];
}

export function RecycleListingsEditor() {
  const [listings, setListings] = useState<RecycleDraft[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/content/recycle");
        const data = (await res.json()) as {
          listings?: Array<{
            productId: string;
            name: string;
            imageUrl: string | null;
            quantity: number;
            price: number;
            active: boolean;
          }>;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "讀取回收清單失敗");
        setListings(
          (data.listings ?? []).map((item) => ({
            productId: item.productId,
            name: item.name,
            imageUrl: item.imageUrl,
            quantity: String(item.quantity),
            price: String(item.price),
            active: item.active,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "讀取回收清單失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const keyword = search.trim();
    if (!keyword) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ type: "SINGLE", search: keyword, pageSize: "8" });
      void fetch(`/api/admin/products?${params}`)
        .then((res) => res.json())
        .then((data: { products?: SearchHit[] }) => setResults(data.products ?? []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const visibleResults = search.trim() ? results : [];

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/content/recycle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listings: listings.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            price: Number(item.price),
            active: item.active,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "儲存回收清單失敗");
      setMessage("單卡回收已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存回收清單失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">載入回收清單...</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        只可選擇單卡。設定回收數量與回收價後，顧客可從導覽的「單卡回收」看到清單。
      </p>
      {error && <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      {message && (
        <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{message}</p>
      )}
      <SearchInput
        value={search}
        onValueChange={setSearch}
        placeholder="搜尋單卡名稱、卡號或系列"
        className="max-w-md"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {visibleResults.map((product) => (
          <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{product.name}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={listings.some((item) => item.productId === product.id)}
              onClick={() =>
                setListings((prev) => [
                  ...prev,
                  {
                    productId: product.id,
                    name: product.name,
                    imageUrl: product.images?.[0]?.url ?? null,
                    quantity: "1",
                    price: "",
                    active: true,
                  },
                ])
              }
            >
              加入回收
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚未選擇回收單卡。</p>
        ) : (
          listings.map((item) => (
            <div key={item.productId} className="grid items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-[auto_1fr_120px_140px_auto]">
              <div className="relative h-16 w-12 overflow-hidden rounded bg-muted">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill unoptimized className="object-contain" sizes="48px" />
                ) : null}
              </div>
              <p className="text-sm font-medium">{item.name}</p>
              <label className="text-xs text-muted-foreground">
                回收數量
                <Input
                  value={item.quantity}
                  onValueChange={(value) =>
                    setListings((prev) =>
                      prev.map((row) => (row.productId === item.productId ? { ...row, quantity: value } : row)),
                    )
                  }
                  inputMode="numeric"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                回收價（HKD）
                <Input
                  value={item.price}
                  onValueChange={(value) =>
                    setListings((prev) =>
                      prev.map((row) => (row.productId === item.productId ? { ...row, price: value } : row)),
                    )
                  }
                  inputMode="decimal"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setListings((prev) => prev.filter((row) => row.productId !== item.productId))}
              >
                移除
              </Button>
            </div>
          ))
        )}
      </div>
      <Button type="button" onClick={() => void save()} disabled={saving}>
        儲存單卡回收
      </Button>
    </div>
  );
}
