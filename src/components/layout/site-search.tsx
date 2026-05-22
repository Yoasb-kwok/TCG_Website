"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
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

  useEffect(() => {
    if (!expanded) {
      setQuery("");
      return;
    }
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
    if (!q) return;
    onClose();
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  if (!expanded) return null;

  return (
    <div className="border-t border-border bg-background/95 px-4 py-3 lg:px-6">
      <div className="mx-auto max-w-7xl">
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
      </div>
    </div>
  );
}
