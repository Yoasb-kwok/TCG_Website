"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface GameTab {
  id: string;
  name: string;
  slug: string;
}

export function GameTabs({ activeSlug }: { activeSlug?: string }) {
  const pathname = usePathname();
  const [gameTypes, setGameTypes] = useState<GameTab[]>([]);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data: GameTab[]) => setGameTypes(data))
      .catch(() => setGameTypes([{ id: "demo", name: "Pokémon", slug: "pokemon" }]));
  }, []);

  if (gameTypes.length === 0) return null;
  if (gameTypes.length === 1 && !activeSlug) return null;

  return (
    <nav className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
      {gameTypes.map((game) => {
        const isActive = activeSlug
          ? activeSlug === game.slug
          : pathname === `/products/${game.slug}`;
        return (
          <Link
            key={game.id}
            href={`/products/${game.slug}`}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {game.name}
          </Link>
        );
      })}
    </nav>
  );
}
