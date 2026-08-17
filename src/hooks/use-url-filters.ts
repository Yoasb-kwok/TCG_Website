"use client";

import { useCallback, useMemo } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import type { FilterState } from "@/components/marketplace/filter-panel";
import {
  filtersFromSearchParams,
  writeFiltersToParams,
} from "@/lib/filter-url";

/**
 * 以 URL search params 為唯一來源的篩選狀態。
 *
 * - `filters` 從 URL 讀取，永遠與 URL 同步
 * - `setFilters` 寫入 URL：
 *   - 在 `/products` 上用 `replace`（避免篩選操作塞滿瀏覽器歷史）
 *   - 在其他頁面上用 `push`（返回鍵回到原頁）
 */
export function useUrlFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: FilterState) => {
      const params = new URLSearchParams(searchParams.toString());
      writeFiltersToParams(params, next);
      const qs = params.toString();

      if (pathname === "/products") {
        router.replace(qs ? `/products?${qs}` : "/products");
      } else {
        router.push(qs ? `/products?${qs}` : "/products");
      }
    },
    [searchParams, router, pathname],
  );

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    // 保留 search 和 language，清除所有篩選
    const search = params.get("search");
    const language = params.get("language");
    params.delete("type");
    params.delete("rarity");
    params.delete("cardSet");
    params.delete("pokemonType");
    params.delete("setCode");
    params.delete("rarityTier");
    params.delete("inStock");
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("sort");
    if (search) params.set("search", search);
    if (language) params.set("language", language);

    const qs = params.toString();
    if (pathname === "/products") {
      router.replace(qs ? `/products?${qs}` : "/products");
    } else {
      router.push(qs ? `/products?${qs}` : "/products");
    }
  }, [searchParams, router, pathname]);

  return { filters, setFilters, resetFilters };
}
