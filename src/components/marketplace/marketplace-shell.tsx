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
import { CatalogProductCard } from "@/components/marketplace/catalog-product-card";
import { homeContainer } from "@/components/home/home-layout";
import type { ProductSort } from "@/lib/types";
import { catalogGame } from "@/lib/games";
import { describeProductCategoryQuery } from "@/lib/storefront-categories";
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
  const categoryCaption = describeProductCategoryQuery({
    type: searchParams.get("type"),
    language: searchParams.get("language"),
    cardSet: searchParams.get("cardSet"),
    setCodes: searchParams.getAll("setCode"),
  });
  const preorderListing =
    searchParams.get("type") === "SEALED_BOX" &&
    !searchQuery &&
    !searchParams.get("game") &&
    !searchParams.get("language") &&
    !searchParams.get("cardSet") &&
    searchParams.getAll("setCode").length === 0;

  const sortLabel: Record<ProductSort, string> = {
    newest: "排序 · 最新上架",
    setCode: "排序 · 系列編號",
    rarityTier: "排序 · 稀有度",
    priceAsc: "排序 · 價格由低至高",
    priceDesc: "排序 · 價格由高至低",
  };

  return (
    <div className={`${homeContainer} flex flex-col gap-8 pt-16 pb-8 text-[#0a0a09]`}>
      <div className="flex flex-col gap-3">
        <h1 className="text-[40px] font-medium leading-[1.3] text-[#0a0a09]">
          {searchQuery ? `搜尋「${searchQuery}」` : game ? game.label : "商品"}
        </h1>
        {categoryCaption && !preorderListing && (
          <p className="text-[16px] leading-[1.65] text-[#625f58]">分類：{categoryCaption}</p>
        )}
        {shown && (
          <p className="text-[16px] leading-[1.65] text-[#625f58]">
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

      <div className="flex flex-col items-start gap-8 xl:flex-row">
        <div className="hidden shrink-0 xl:block">
          {filterSource && (
            <FilterPanel
              filters={filters}
              onChange={changeFilters}
              availableFilters={filterSource.filters}
              showSort={false}
            />
          )}
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-6" data-product-list={shown ? "ready" : "pending"}>
          <div className="flex items-center justify-between gap-4">
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" className="border-[#080808] bg-white text-[#0a0a09] xl:hidden">
                    <Filter className="mr-2 h-4 w-4" />
                    篩選
                  </Button>
                }
              />
              <SheetContent side="left" className="w-80 border-[#e7e1d6] bg-[#f7f5ef] text-[#0a0a09]">
                <SheetHeader>
                  <SheetTitle>篩選</SheetTitle>
                </SheetHeader>
                {filterSource && (
                  <FilterPanel
                    filters={filters}
                    onChange={changeFilters}
                    availableFilters={filterSource.filters}
                    showSort={false}
                  />
                )}
              </SheetContent>
            </Sheet>
            <p className="hidden text-[14px] font-medium leading-[1.45] text-[#0a0a09] xl:block">篩選</p>
            <label className="relative">
              <span className="sr-only">排序</span>
              <select
                value={filters.sort}
                onChange={(event) =>
                  changeFilters({ ...filters, sort: event.target.value as ProductSort })
                }
                className="h-[48px] w-[200px] appearance-none rounded-[10px] border border-[#080808] bg-white px-4 text-center text-[14px] font-medium text-[#080808]"
              >
                {(Object.keys(sortLabel) as ProductSort[]).map((value) => (
                  <option key={value} value={value}>
                    {sortLabel[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {shown.products.map((product) => (
                      <CatalogProductCard key={product.id} product={product} />
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
