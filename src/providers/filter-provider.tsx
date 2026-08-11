"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { FilterState } from "@/components/marketplace/filter-panel";
import {
  filtersFromSearchParams,
  writeFiltersToParams,
  DEFAULT_FILTERS,
  countActiveFilters,
} from "@/lib/filter-url";

interface FilterContextValue {
  filters: FilterState;
  setFilters: (next: FilterState) => void;
  resetFilters: () => void;
  activeCount: number;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTERS);

  // Initialize from URL on mount (client-only, avoids hydration mismatch)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setFiltersState(filtersFromSearchParams(sp));
  }, []);

  // Listen for browser back/forward to re-sync from URL
  useEffect(() => {
    const handler = () => {
      const sp = new URLSearchParams(window.location.search);
      setFiltersState(filtersFromSearchParams(sp));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const setFilters = useCallback(
    (next: FilterState) => {
      // 1. Instant state update — all consumers sync immediately
      setFiltersState(next);

      // 2. Update URL for shareability
      const sp = new URLSearchParams(window.location.search);
      writeFiltersToParams(sp, next);
      const qs = sp.toString();
      const pathname = window.location.pathname;

      if (pathname === "/products") {
        // Same page: use replaceState to avoid full navigation
        window.history.replaceState(
          null,
          "",
          qs ? `/products?${qs}` : "/products",
        );
      } else {
        // Different page: navigate to /products
        router.push(qs ? `/products?${qs}` : "/products");
      }
    },
    [router],
  );

  const resetFilters = useCallback(() => {
    const sp = new URLSearchParams(window.location.search);
    const search = sp.get("search");
    const language = sp.get("language");
    sp.delete("type");
    sp.delete("rarity");
    sp.delete("cardSet");
    sp.delete("pokemonType");
    sp.delete("setCode");
    sp.delete("rarityTier");
    sp.delete("inStock");
    sp.delete("minPrice");
    sp.delete("maxPrice");
    sp.delete("sort");
    if (search) sp.set("search", search);
    if (language) sp.set("language", language);

    setFiltersState(filtersFromSearchParams(sp));

    const qs = sp.toString();
    const pathname = window.location.pathname;
    if (pathname === "/products") {
      window.history.replaceState(
        null,
        "",
        qs ? `/products?${qs}` : "/products",
      );
    }
  }, []);

  const activeCount = countActiveFilters(filters);

  return (
    <FilterContext.Provider
      value={{ filters, setFilters, resetFilters, activeCount }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error("useFilterContext must be used within FilterProvider");
  }
  return ctx;
}
