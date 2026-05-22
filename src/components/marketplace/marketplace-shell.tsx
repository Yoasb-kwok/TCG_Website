"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterPanel, type FilterState } from "@/components/marketplace/filter-panel";
import { ProductCard } from "@/components/marketplace/product-card";
import type { ProductType, ProductsResponse } from "@/lib/types";

const DEFAULT_FILTERS: FilterState = {
  types: [],
  rarities: [],
  cardSets: [],
  pokemonTypes: [],
  setCodes: [],
  rarityTiers: [],
  inStock: false,
  priceRange: [0, 5000],
  sort: "newest",
};

export function MarketplaceShell() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "24");

    if (filters.inStock) params.set("inStock", "true");
    if (filters.priceRange[0] > 0) params.set("minPrice", String(filters.priceRange[0]));
    if (filters.priceRange[1] < 5000) params.set("maxPrice", String(filters.priceRange[1]));

    const urlType = searchParams.get("type") as ProductType | null;
    const urlSet = searchParams.get("cardSet");
    const urlLang = searchParams.get("language");
    const urlSearch = searchParams.get("search")?.trim();

    if (urlType) params.set("type", urlType);
    if (urlSet) params.set("cardSet", urlSet);
    if (urlLang) params.set("language", urlLang);
    if (urlSearch) params.set("search", urlSearch);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);

    filters.types.forEach((t) => params.append("type", t));
    filters.cardSets.forEach((s) => params.append("cardSet", s));
    filters.rarities.forEach((r) => params.append("rarity", r));
    filters.setCodes.forEach((c) => params.append("setCode", c));
    filters.rarityTiers.forEach((t) => params.append("rarityTier", t));
    filters.pokemonTypes.forEach((p) => params.append("pokemonType", p));

    const res = await fetch(`/api/products?${params}`);
    const json = (await res.json()) as ProductsResponse;
    setData(json);
    setLoading(false);
  }, [filters, page, searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [filters, searchParams]);

  const searchQuery = searchParams.get("search")?.trim() ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {searchQuery ? `搜尋「${searchQuery}」` : "商品"}
          </h1>
          {data && (
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery ? `找到 ${data.total} 件相關商品` : `共 ${data.total} 件商品`}
            </p>
          )}
        </div>

        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" className="border-border text-foreground lg:hidden">
                <Filter className="mr-2 h-4 w-4" />
                篩選
              </Button>
            }
          />
          <SheetContent side="left" className="w-80 border-border bg-background text-foreground">
            <SheetHeader>
              <SheetTitle>篩選</SheetTitle>
            </SheetHeader>
            {data && (
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                availableFilters={data.filters}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-8">
        <div className="hidden w-56 shrink-0 lg:block">
          {data && (
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              availableFilters={data.filters}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.products.length === 0 ? (
            <p className="py-24 text-center text-muted-foreground">沒有符合條件的商品</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                {data?.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {data && data.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    className="border-border text-foreground"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    上一頁
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    className="border-border text-foreground"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一頁
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
