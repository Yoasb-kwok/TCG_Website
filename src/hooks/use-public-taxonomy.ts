"use client";

import { useEffect, useMemo, useState } from "react";
import type { TaxonomyKind, TaxonomyOptionDto } from "@/lib/taxonomy-types";

type GroupedTaxonomy = Record<TaxonomyKind, TaxonomyOptionDto[]>;

const EMPTY: GroupedTaxonomy = {
  SET_CODE: [],
  RARITY: [],
  CARD_NUMBER: [],
  CARD_CATEGORY: [],
  POKEMON_ATTRIBUTE: [],
  PRODUCT_TYPE: [],
};

export function usePublicTaxonomy() {
  const [grouped, setGrouped] = useState<GroupedTaxonomy>(EMPTY);

  useEffect(() => {
    fetch("/api/taxonomy?grouped=1")
      .then((r) => r.json())
      .then((d: { grouped?: GroupedTaxonomy }) => {
        if (d.grouped) setGrouped(d.grouped);
      })
      .catch(() => setGrouped(EMPTY));
  }, []);

  return useMemo(
    () => ({
      grouped,
      labelFor(kind: TaxonomyKind, value?: string | null) {
        if (!value) return "—";
        return grouped[kind]?.find((o) => o.value === value)?.label ?? value;
      },
      options(kind: TaxonomyKind) {
        return grouped[kind] ?? [];
      },
    }),
    [grouped],
  );
}
