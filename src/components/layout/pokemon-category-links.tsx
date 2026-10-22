"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  CATEGORY_GROUP_LABELS,
  type StorefrontCategoryGroup,
  type StorefrontCategoryLink,
} from "@/lib/storefront-categories";
import { cn } from "@/lib/utils";

const GROUP_ORDER: StorefrontCategoryGroup[] = ["type", "language", "series"];

export function PokemonCategoryLinks({
  links,
  onNavigate,
  id,
  variant = "desktop",
}: {
  links: StorefrontCategoryLink[];
  onNavigate?: () => void;
  id?: string;
  variant?: "desktop" | "mobile";
}) {
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: links.filter((item) => item.group === group),
  })).filter((group) => group.items.length > 0);

  return (
    <div id={id} role="region" aria-label="Pokémon TCG 分類">
      {groups.map(({ group, items }) => (
        <div key={group} className={variant === "desktop" ? "mb-4 last:mb-0" : "mt-3"}>
          <p className="mb-1 px-2 text-xs font-semibold tracking-wider text-muted-foreground">
            {CATEGORY_GROUP_LABELS[group]}
          </p>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center justify-between rounded px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                    variant === "desktop" ? "py-1.5" : "py-2",
                  )}
                >
                  {item.label}
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
