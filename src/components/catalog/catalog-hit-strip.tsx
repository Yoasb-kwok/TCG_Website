"use client";

import Image from "next/image";
import type { CatalogSearchHit } from "@/lib/types";
import { cn } from "@/lib/utils";

export function catalogHitName(card: CatalogSearchHit): string {
  const name = [card.nameZhTw, card.nameJa, card.nameEn].find(
    (value) => value && value.trim() && value.trim() !== "待補",
  );
  return name?.trim() || "待補";
}

export function catalogHitManualName(card: CatalogSearchHit): string {
  return [catalogHitName(card), card.setCode, card.collectorNumber].filter(Boolean).join(" ");
}

interface CatalogHitStripProps {
  cards: CatalogSearchHit[];
  total: number;
  hint: string;
  onPick?: (card: CatalogSearchHit) => void;
  className?: string;
}

export function CatalogHitStrip({ cards, total, hint, onPick, className }: CatalogHitStripProps) {
  if (cards.length === 0) return null;

  return (
    <section aria-label="卡表對照" className={cn("mb-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-foreground">卡表</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {cards.map((card) => {
          const name = catalogHitName(card);
          const body = (
            <>
              <span className="relative block h-20 overflow-hidden rounded-md bg-muted">
                {card.imageUrl ? (
                  <Image src={card.imageUrl} alt="" fill className="object-contain p-1" sizes="96px" unoptimized />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    無圖
                  </span>
                )}
              </span>
              <span className="mt-1 line-clamp-2 text-xs font-bold leading-snug">{name}</span>
              <span className="text-[10px] font-bold text-muted-foreground">
                {[card.setCode, card.collectorNumber].filter(Boolean).join(" · ")}
                {card.rarity ? ` · ${card.rarity}` : ""}
              </span>
            </>
          );
          return (
            <li key={card.id} className="w-28 shrink-0">
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(card)}
                  className="flex h-full w-full flex-col rounded-lg border border-border bg-card p-1.5 text-left hover:border-pink-400"
                >
                  {body}
                </button>
              ) : (
                <div className="flex h-full flex-col rounded-lg border border-border bg-card p-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {total > cards.length && (
        <p className="mt-1 text-xs text-muted-foreground">
          卡表還有 {total - cards.length} 張。加上系列代碼或完整卡號可以收窄。
        </p>
      )}
    </section>
  );
}
