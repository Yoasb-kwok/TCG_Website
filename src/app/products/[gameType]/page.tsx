import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { getGameTypeBySlug } from "@/lib/game-types";
import { isDatabaseConfigured } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameType: string }>;
}) {
  const { gameType } = await params;
  const game = isDatabaseConfigured()
    ? await getGameTypeBySlug(gameType)
    : { name: "Pokémon" };
  return {
    title: game?.name ? `${game.name} 商品` : "商品",
  };
}

export default async function GameTypeProductsPage({
  params,
}: {
  params: Promise<{ gameType: string }>;
}) {
  const { gameType: slug } = await params;

  // Validate slug exists
  if (isDatabaseConfigured()) {
    const game = await getGameTypeBySlug(slug);
    if (!game) {
      notFound();
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MarketplaceShell gameTypeSlug={slug} />
    </Suspense>
  );
}
