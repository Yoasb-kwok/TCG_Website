"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterPanel } from "@/components/marketplace/filter-panel";
import { useFilterContext } from "@/providers/filter-provider";
import { cn } from "@/lib/utils";

interface SiteSearchToggleProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function SiteSearchToggle({
  expanded,
  onToggle,
  className,
}: SiteSearchToggleProps) {
  return (
    <button
      type="button"
      className={cn(
        "p-2 hover:text-foreground",
        expanded && "text-foreground",
        className,
      )}
      aria-label={expanded ? "關閉搜尋" : "搜尋商品"}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <Search className="h-5 w-5" />
    </button>
  );
}

interface SiteSearchBarProps {
  expanded: boolean;
  onClose: () => void;
}

export function SiteSearchBar({ expanded, onClose }: SiteSearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const { filters, setFilters, activeCount } = useFilterContext();

  useEffect(() => {
    if (!expanded) {
      setShowFilters(false);
      return;
    }
    // Pre-fill query from URL
    const sp = new URLSearchParams(window.location.search);
    const existing = sp.get("search");
    if (existing) setQuery(existing);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, onClose]);

  const submit = () => {
    const q = query.trim();
    onClose();
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  if (!expanded) return null;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur px-4 lg:px-6">
      <div className="mx-auto max-w-7xl py-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋商品名稱、系列、卡號…"
            className="flex-1"
          />
          <Button type="submit" className="shrink-0">
            搜尋
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 border-border"
            aria-label="關閉搜尋"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </form>

        {/* 篩選切換按鈕 */}
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <Filter className="h-4 w-4" />
          篩選
          {activeCount > 0 && (
            <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              showFilters && "rotate-180",
            )}
          />
        </button>

        {/* 篩選面板 */}
        {showFilters && (
          <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-card p-4">
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              availableFilters={{
                cardSets: [],
                rarities: [],
                pokemonTypes: [],
                setCodes: [],
                rarityTiers: [],
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
