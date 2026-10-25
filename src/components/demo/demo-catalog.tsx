"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/marketplace/product-card";
import { PRODUCT_TYPES } from "@/lib/constants";
import { DEMO_STORE_PATH, filterDemoCatalog } from "@/lib/demo-shop";
import { cn } from "@/lib/utils";

export function DemoCatalog() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const products = useMemo(
    () => filterDemoCatalog({ search, type: type || undefined }),
    [search, type],
  );

  return (
    <section id="catalog" className="scroll-mt-32 mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-300">現貨目錄</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0a0a09] sm:text-3xl">商品</h2>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜尋卡名、卡號或 SKU"
          aria-label="搜尋示範商品"
          className="h-11 w-full rounded-full border border-[#e6dfd2] bg-[#fbf6ea] px-4 text-sm text-[#0a0a09] outline-none placeholder:text-[#625f58] focus:border-[#c8a24a] sm:max-w-xs"
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
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
        <p className="mt-8 text-sm text-[#625f58]">沒有符合的示範商品</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              hrefBase={`${DEMO_STORE_PATH}/products`}
              className="rounded-2xl border-[#e6dfd2] bg-white text-[#0a0a09] shadow-[0_10px_24px_rgba(0,0,0,0.06)] hover:border-[#c8a24a]"
              setBadgeClassName="bg-gradient-to-r from-sky-500 to-violet-500 text-[10px] text-white"
            />
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
      className={cn(
        "rounded-full px-3 py-1 text-sm transition",
        active
          ? "bg-[#080808] font-semibold text-white"
          : "border border-[#e6dfd2] bg-white text-[#625f58] hover:border-[#c8a24a] hover:text-[#0a0a09]",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
