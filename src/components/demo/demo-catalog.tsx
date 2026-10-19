"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/marketplace/product-card";
import { PRODUCT_TYPES } from "@/lib/constants";
import { filterDemoCatalog } from "@/lib/demo-shop";

export function DemoCatalog() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const products = useMemo(
    () => filterDemoCatalog({ search, type: type || undefined }),
    [search, type],
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">商品</h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜尋卡名、卡號或 SKU"
          aria-label="搜尋示範商品"
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-pink-400 sm:max-w-xs"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <FilterChip active={type === ""} onClick={() => setType("")} label="全部" />
        {PRODUCT_TYPES.map((item) => (
          <FilterChip
            key={item.value}
            active={type === item.value}
            onClick={() => setType(item.value)}
            label={item.label}
          />
        ))}
      </div>
      {products.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">沒有符合的示範商品</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} hrefBase="/demo/products" />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-foreground px-3 py-1 text-sm text-background"
          : "rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
      }
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
