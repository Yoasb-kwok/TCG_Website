"use client";

import Image from "next/image";
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
import { STOREFRONT_MAX_PRICE, type FilterState } from "@/lib/storefront-query";
import type { ProductSort, ProductType } from "@/lib/types";
import { SEARCH_BAR_SELECT_CLASS } from "@/lib/search-bar-styles";

export type { FilterState };

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
  showSort?: boolean;
}

function FrameTrigger({ children }: { children: React.ReactNode }) {
  return (
    <AccordionTrigger className="rounded-none py-0 text-[14px] font-medium leading-[1.45] text-[#0a0a09] hover:no-underline [&_[data-slot=accordion-trigger-icon]]:hidden">
      {children}
      <Image
        src="/brand/home/icon-chevron.svg"
        alt=""
        width={16}
        height={16}
        unoptimized
        className="transition-transform group-aria-expanded/accordion-trigger:rotate-180"
      />
    </AccordionTrigger>
  );
}

export function FilterPanel({
  filters,
  onChange,
  availableFilters,
  maxPrice = STOREFRONT_MAX_PRICE,
  showSort = true,
}: FilterPanelProps) {
  const { grouped } = usePublicTaxonomy();
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
    <aside className="flex w-full flex-col gap-6 rounded-[16px] bg-white p-6 xl:w-[248px]">
      <h2 className="text-[20px] font-medium leading-[1.45] text-[#0a0a09]">篩選</h2>

      {showSort ? <div className="space-y-2">
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
      </div> : null}

      <label className="flex items-center gap-2 text-[13px] leading-[1.6] text-[#0a0a09]">
        <input
          id="in-stock"
          type="checkbox"
          checked={filters.inStock}
          onChange={(event) => onChange({ ...filters, inStock: event.target.checked })}
          className="size-3.5 accent-[#080808]"
        />
        只顯示有貨
      </label>

      <Accordion className="gap-6">
        <AccordionItem value="setCode" className="border-t border-[rgba(200,162,74,0.55)] pt-6">
          <FrameTrigger>系列編號</FrameTrigger>
          <AccordionContent className="max-h-48 space-y-2 overflow-y-auto">
            {setSeriesOptions.map(({ value, label, id }) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox
                  id={`setCode-${value}`}
                  checked={filters.setCodes.includes(value)}
                  disabled={!hasSetCode(value)}
                  onCheckedChange={() => toggleArray("setCodes", value)}
                />
                <Label
                  htmlFor={`setCode-${value}`}
                  className={`text-sm ${hasSetCode(value) ? "text-[#0a0a09]" : "text-muted-foreground/50"}`}
                >
                  {label}
                </Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rarityTier" className="border-t border-[rgba(200,162,74,0.55)] pt-6">
          <FrameTrigger>稀有度分類</FrameTrigger>
          <AccordionContent className="max-h-56 space-y-2 overflow-y-auto">
            {rarityTierOptions.map(({ value, label, id }) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox
                  id={`tier-${value}`}
                  checked={filters.rarityTiers.includes(value)}
                  disabled={!hasRarityTier(value)}
                  onCheckedChange={() => toggleArray("rarityTiers", value)}
                />
                <Label
                  htmlFor={`tier-${value}`}
                  className={`text-sm ${hasRarityTier(value) ? "text-[#0a0a09]" : "text-muted-foreground/50"}`}
                >
                  {label}
                </Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price" className="border-t border-[rgba(200,162,74,0.55)] pt-6">
          <FrameTrigger>價格 (HKD)</FrameTrigger>
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

        <AccordionItem value="type" className="border-t border-[rgba(200,162,74,0.55)] pt-6">
          <FrameTrigger>類型</FrameTrigger>
          <AccordionContent className="space-y-2">
            {productTypeOptions.map((t) => (
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
                  className="text-sm text-[#0a0a09]"
                >
                  {t.label}
                </Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="set" className="border-t border-[rgba(200,162,74,0.55)] pt-6">
          <FrameTrigger>系列名稱</FrameTrigger>
            <AccordionContent className="max-h-48 space-y-2 overflow-y-auto">
              {availableFilters.cardSets.map((set) => (
                <div key={set} className="flex items-center gap-2">
                  <Checkbox
                    id={`set-${set}`}
                    checked={filters.cardSets.includes(set)}
                    onCheckedChange={() => toggleArray("cardSets", set)}
                  />
                  <Label htmlFor={`set-${set}`} className="text-sm text-[#0a0a09]">
                    {set}
                  </Label>
                </div>
              ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ptype" className="border-t border-[rgba(200,162,74,0.55)] pt-6">
          <FrameTrigger>屬性</FrameTrigger>
            <AccordionContent className="space-y-2">
              {availableFilters.pokemonTypes.map((pt) => (
                <div key={pt} className="flex items-center gap-2">
                  <Checkbox
                    id={`pt-${pt}`}
                    checked={filters.pokemonTypes.includes(pt)}
                    onCheckedChange={() => toggleArray("pokemonTypes", pt)}
                  />
                  <Label htmlFor={`pt-${pt}`} className="text-sm text-[#0a0a09]">
                    {pt}
                  </Label>
                </div>
              ))}
            </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
}
