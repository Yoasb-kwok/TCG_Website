"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CatalogHitStrip } from "@/components/catalog/catalog-hit-strip";
import { FilterPanel } from "@/components/marketplace/filter-panel";
import { ProductsLoading } from "@/components/marketplace/products-loading";
import { ProductCard } from "@/components/marketplace/product-card";
import { catalogGame } from "@/lib/games";
import {
  DEFAULT_STOREFRONT_FILTERS,
  catalogForRequest,
  storefrontRequestParams,
  type FilterState,
} from "@/lib/storefront-query";
import type { ProductsResponse } from "@/lib/types";

export function MarketplaceShell({
  initialData,
  initialKey,
}: {
  initialData: ProductsResponse;
  initialKey: string;
}) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_STOREFRONT_FILTERS);
  const [page, setPage] = useState(1);
  const urlKey = searchParams.toString();
  const [trackedUrl, setTrackedUrl] = useState(urlKey);
  const [result, setResult] = useState<{ key: string; data: ProductsResponse }>({
    key: initialKey,
    data: initialData,
  });

  const urlChanged = trackedUrl !== urlKey;
  if (urlChanged) {
    setTrackedUrl(urlKey);
    setPage(1);
  }

  const currentPage = urlChanged ? 1 : page;
  const activeKey = storefrontRequestParams(searchParams, filters, currentPage).toString();
  const serverMatch = activeKey === initialKey ? { key: initialKey, data: initialData } : null;
  const shown = catalogForRequest(serverMatch ?? result, activeKey);
  const catalogReady = shown !== null;

  useEffect(() => {
    if (catalogReady) return;
    const controller = new AbortController();
    let cancelled = false;
    const key = activeKey;
    const run = async () => {
      try {
        const res = await fetch(`/api/products?${key}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as ProductsResponse;
        if (!cancelled) setResult({ key, data: json });
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
      }
    };
    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeKey, catalogReady]);

  const changeFilters = (next: FilterState) => {
    setFilters(next);
    setPage(1);
  };

  const searchQuery = searchParams.get("search")?.trim() ?? "";
  const game = catalogGame(searchParams.get("game"));
  const unsupportedGame = Boolean(game && !game.supported);
  const filterSource = shown ?? result.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {searchQuery
              ? `搜尋「${searchQuery}」`
              : game
                ? game.label
                : "商品"}
          </h1>
          {shown && (
            <p className="mt-1 text-sm text-muted-foreground">
              {unsupportedGame
                ? "此遊戲尚未上架，暫時只提供 Pokémon TCG。"
                : searchQuery
                  ? `找到 ${shown.total} 件相關商品${
                      shown.catalog && shown.catalog.total > 0 ? `，卡表 ${shown.catalog.total} 張` : ""
                    }`
                  : `共 ${shown.total} 件商品`}
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
            {filterSource && (
              <FilterPanel
                filters={filters}
                onChange={changeFilters}
                availableFilters={filterSource.filters}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-8">
        <div className="hidden w-56 shrink-0 lg:block">
          {filterSource && (
            <FilterPanel
              filters={filters}
              onChange={changeFilters}
              availableFilters={filterSource.filters}
            />
          )}
        </div>

        <div className="min-w-0 flex-1" data-product-list={shown ? "ready" : "pending"}>
          {shown ? (
            <>
              {searchQuery && shown.catalog && (
                <CatalogHitStrip
                  cards={shown.catalog.cards}
                  total={shown.catalog.total}
                  hint="官方卡名對照。未上架的卡沒有售價，也不會加入購物車。"
                />
              )}
              {shown.products.length === 0 ? (
                <p className="py-24 text-center text-muted-foreground">
                  {unsupportedGame
                    ? "此遊戲尚未上架"
                    : shown.catalog && shown.catalog.total > 0
                      ? "沒有上架商品。上面是卡表對照。"
                      : "沒有符合條件的商品"}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                    {shown.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {shown.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        className="border-border text-foreground"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        上一頁
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentPage} / {shown.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        className="border-border text-foreground"
                        disabled={currentPage >= shown.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        下一頁
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <ProductsLoading />
          )}
        </div>
      </div>
    </div>
  );
}
