"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TaxonomyKind, TaxonomyOptionDto } from "@/lib/taxonomy-types";

type GroupedTaxonomy = Record<TaxonomyKind, TaxonomyOptionDto[]>;

interface TaxonomyContextValue {
  grouped: GroupedTaxonomy;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  optionsFor: (kind: TaxonomyKind, parentValue?: string | null) => TaxonomyOptionDto[];
  labelFor: (kind: TaxonomyKind, value?: string | null) => string;
}

const EMPTY: GroupedTaxonomy = {
  SET_CODE: [],
  RARITY: [],
  CARD_NUMBER: [],
  CARD_CATEGORY: [],
  POKEMON_ATTRIBUTE: [],
  PRODUCT_TYPE: [],
};

const TaxonomyContext = createContext<TaxonomyContextValue | null>(null);

export function TaxonomyProvider({ children }: { children: React.ReactNode }) {
  const [grouped, setGrouped] = useState<GroupedTaxonomy>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/taxonomy?grouped=1");
      const data = (await res.json()) as {
        grouped?: GroupedTaxonomy;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          data.error ??
            "讀取標籤失敗。若為資料庫錯誤，請執行 npx prisma migrate deploy && npm run db:seed-taxonomy",
        );
      }
      setGrouped(data.grouped ?? EMPTY);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "讀取標籤失敗";
      setError(msg);
      setGrouped(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<TaxonomyContextValue>(
    () => ({
      grouped,
      loading,
      error,
      refresh,
      optionsFor(kind, parentValue) {
        const list = grouped[kind] ?? [];
        if (kind !== "CARD_NUMBER" || parentValue === undefined) {
          return list.filter((o) => o.active);
        }
        if (!parentValue) return [];
        return list.filter((o) => o.active && o.parentValue === parentValue);
      },
      labelFor(kind, value) {
        if (!value) return "—";
        const found = grouped[kind]?.find((o) => o.value === value);
        return found?.label ?? value;
      },
    }),
    [grouped, loading, error, refresh],
  );

  return (
    <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>
  );
}

export function useTaxonomy() {
  const ctx = useContext(TaxonomyContext);
  if (!ctx) {
    throw new Error("useTaxonomy must be used within TaxonomyProvider");
  }
  return ctx;
}
