"use client";

import Image from "next/image";
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
  appearance?: "default" | "ink";
}

export function SiteSearchToggle({
  expanded,
  onToggle,
  className,
  appearance = "default",
}: SiteSearchToggleProps) {
  return (
    <button
      type="button"
      className={cn(
        appearance === "ink"
          ? "inline-flex items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a]"
          : "p-2 hover:text-foreground",
        expanded && appearance !== "ink" && "text-foreground",
        className,
      )}
      aria-label={expanded ? "關閉搜尋" : "搜尋商品"}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      {appearance === "ink" ? (
        <Image src="/brand/home/icon-search.svg" alt="" width={22} height={22} unoptimized />
      ) : (
        <Search className="h-5 w-5" />
      )}
    </button>
  );
}

interface SiteSearchBarProps {
  expanded: boolean;
  onClose: () => void;
}

function SiteSearchForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    onClose();
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  return (
    <div className="border-t border-[#c8a24a]/40 bg-[#080808] px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-[1280px]">
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
              placeholder="搜尋商品、卡名或卡號…"
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

export function SiteSearchBar({ expanded, onClose }: SiteSearchBarProps) {
  if (!expanded) return null;
  return <SiteSearchForm onClose={onClose} />;
}
