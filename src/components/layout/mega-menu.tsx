"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface GameTypeItem {
  id: string;
  name: string;
  slug: string;
}

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
  gameTypes: GameTypeItem[];
}

const PRODUCT_TYPE_LINKS = [
  { label: "單卡", type: "SINGLE" },
  { label: "封盒 / 補充包", type: "SEALED_BOX" },
  { label: "配件", type: "ACCESSORY" },
];

export function MegaMenu({ open, onClose, gameTypes }: MegaMenuProps) {
  if (!open) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full z-40 border-t border-border bg-background/95 backdrop-blur-sm"
      onMouseLeave={onClose}
    >
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-6">
        <div className="flex flex-wrap gap-8">
          {gameTypes.map((game) => (
            <div key={game.id} className="w-48 shrink-0 space-y-1">
              <Link
                href={`/products/${game.slug}`}
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-foreground hover:underline"
                onClick={onClose}
              >
                {game.name}
              </Link>
              {PRODUCT_TYPE_LINKS.map((sub) => (
                <Link
                  key={sub.type}
                  href={`/products/${game.slug}?type=${sub.type}`}
                  className="group flex items-center justify-between rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={onClose}
                >
                  {sub.label}
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
