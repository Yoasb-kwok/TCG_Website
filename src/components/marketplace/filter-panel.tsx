"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PRODUCT_TYPES } from "@/lib/constants";
import { usePublicTaxonomy } from "@/hooks/use-public-taxonomy";
import type { ProductSort, ProductType } from "@/lib/types";
import { SEARCH_BAR_SELECT_CLASS } from "@/lib/search-bar-styles";

export interface FilterState {
  types: ProductType[];
  rarities: string[];
  cardSets: string[];
  pokemonTypes: string[];
  setCodes: string[];
  rarityTiers: string[];
  inStock: boolean;
  priceRange: [number, number];
  sort: ProductSort;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableFilters: {
    cardSets: string[];
    rarities: string[];
    pokemonTypes: string[];
    setCodes: string[];
    rarityTiers: string[];
  };
  maxPrice?: number;
}

export function FilterPanel({
  filters,
  onChange,
  availableFilters,
  maxPrice = 5000,
}: FilterPanelProps) {
  const { grouped, loading: taxonomyLoading } = usePublicTaxonomy();
  const setSeriesOptions = grouped.SET_CODE;
  const rarityTierOptions = grouped.RARITY;
  const productTypeOptions = (
    grouped.PRODUCT_TYPE.length > 0
      ? grouped.PRODUCT_TYPE
      : PRODUCT_TYPES.map((t) => ({
          value: t.value,
          label: t.label,
          active: true,
        }))
  ).filter((t) => t.active !== false);

  const toggleArray = <T extends string>(
    key: keyof Pick<
      FilterState,
      "types" | "rarities" | "cardSets" | "pokemonTypes" | "setCodes" | "rarityTiers"
    >,
    value: T,
  ) => {
    const current = filters[key] as T[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const hasSetCode = (code: string) =>
    availableFilters.setCodes.length === 0 ||
    availableFilters.setCodes.includes(code);

  const hasRarityTier = (tier: string) =>
    availableFilters.rarityTiers.length === 0 ||
    availableFilters.rarityTiers.includes(tier);

  return (
    <aside className="sticky top-24 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">篩選</h2>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">排序</Label>
        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({ ...filters, sort: e.target.value as ProductSort })
          }
          className={SEARCH_BAR_SELECT_CLASS}
        >
          <option value="newest">最新上架</option>
          <option value="setCode">系列編號 (M3→M1L…)</option>
          <option value="rarityTier">稀有度 (MUR→R…)</option>
          <option value="priceAsc">價格由低至高</option>
          <option value="priceDesc">價格由高至低</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="in-stock"
          checked={filters.inStock}
          onCheckedChange={(checked) =>
            onChange({ ...filters, inStock: checked === true })
          }
        />
        <Label htmlFor="in-stock" className="text-sm text-foreground/80">
          只顯示有貨
        </Label>
      </div>

      <Accordion multiple>
        <AccordionItem value="setCode" className="border-border">
          <AccordionTrigger className="text-sm text-foreground hover:no-underline">
            系列編號
          </AccordionTrigger>
          <AccordionContent className="max-h-48 space-y-2 overflow-y-auto">
            {taxonomyLoading && setSeriesOptions.length === 0 ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))
            ) : (
              setSeriesOptions.map(({ value, label, id }) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox
                    id={`setCode-${value}`}
                    checked={filters.setCodes.includes(value)}
                    disabled={!hasSetCode(value)}
                    onCheckedChange={() => toggleArray("setCodes", value)}
                  />
                  <Label
                    htmlFor={`setCode-${value}`}
                    className={`text-sm ${hasSetCode(value) ? "text-foreground/80" : "text-muted-foreground/50"}`}
                  >
                    {label}
                  </Label>
                </div>
              ))
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rarityTier" className="border-border">
          <AccordionTrigger className="text-sm text-foreground hover:no-underline">
            稀有度分類
          </AccordionTrigger>
          <AccordionContent className="max-h-56 space-y-2 overflow-y-auto">
            {taxonomyLoading && rarityTierOptions.length === 0 ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))
            ) : (
              rarityTierOptions.map(({ value, label, id }) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox
                    id={`tier-${value}`}
                    checked={filters.rarityTiers.includes(value)}
                    disabled={!hasRarityTier(value)}
                    onCheckedChange={() => toggleArray("rarityTiers", value)}
                  />
                  <Label
                    htmlFor={`tier-${value}`}
                    className={`text-sm ${hasRarityTier(value) ? "text-foreground/80" : "text-muted-foreground/50"}`}
                  >
                    {label}
                  </Label>
                </div>
              ))
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price" className="border-border">
          <AccordionTrigger className="text-sm text-foreground hover:no-underline">
            價格 (HKD)
          </AccordionTrigger>
          <AccordionContent>
            <Slider
              min={0}
              max={maxPrice}
              step={10}
              value={filters.priceRange}
              onValueChange={(value) =>
                onChange({ ...filters, priceRange: value as [number, number] })
              }
              className="mt-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {filters.priceRange[0]} – {filters.priceRange[1]} HKD
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="type" className="border-border">
          <AccordionTrigger className="text-sm text-foreground hover:no-underline">
            類型
          </AccordionTrigger>
          <AccordionContent className="space-y-2">
            {taxonomyLoading && grouped.PRODUCT_TYPE.length === 0
              ? [0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                    <div className="h-3.5 w-14 animate-pulse rounded bg-muted" />
                  </div>
                ))
              : productTypeOptions.map((t) => (
                  <div key={t.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${t.value}`}
                      checked={filters.types.includes(t.value as ProductType)}
                      onCheckedChange={() =>
                        toggleArray("types", t.value as ProductType)
                      }
                    />
                    <Label
                      htmlFor={`type-${t.value}`}
                      className="text-sm text-foreground/80"
                    >
                      {t.label}
                    </Label>
                  </div>
                ))}
          </AccordionContent>
        </AccordionItem>

        {availableFilters.cardSets.length > 0 && (
          <AccordionItem value="set" className="border-border">
            <AccordionTrigger className="text-sm text-foreground hover:no-underline">
              系列名稱
            </AccordionTrigger>
            <AccordionContent className="max-h-48 space-y-2 overflow-y-auto">
              {availableFilters.cardSets.map((set) => (
                <div key={set} className="flex items-center gap-2">
                  <Checkbox
                    id={`set-${set}`}
                    checked={filters.cardSets.includes(set)}
                    onCheckedChange={() => toggleArray("cardSets", set)}
                  />
                  <Label htmlFor={`set-${set}`} className="text-sm text-foreground/80">
                    {set}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {availableFilters.pokemonTypes.length > 0 && (
          <AccordionItem value="ptype" className="border-border">
            <AccordionTrigger className="text-sm text-foreground hover:no-underline">
              屬性
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              {availableFilters.pokemonTypes.map((pt) => (
                <div key={pt} className="flex items-center gap-2">
                  <Checkbox
                    id={`pt-${pt}`}
                    checked={filters.pokemonTypes.includes(pt)}
                    onCheckedChange={() => toggleArray("pokemonTypes", pt)}
                  />
                  <Label htmlFor={`pt-${pt}`} className="text-sm text-foreground/80">
                    {pt}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </aside>
  );
}
