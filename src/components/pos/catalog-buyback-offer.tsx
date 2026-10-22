import { catalogBuybackPriceLabel, catalogTargetBuybackQtyLabel } from "@/lib/buyback-catalog";

/** Standing catalog offer. Display only: it does not limit the buyback being entered. */
export function CatalogBuybackOffer({
  buybackPrice,
  targetBuybackQty,
  variant = "tile",
}: {
  buybackPrice?: number | null;
  targetBuybackQty?: number | null;
  variant?: "tile" | "panel";
}) {
  const price = catalogBuybackPriceLabel(buybackPrice);
  const quantity = catalogTargetBuybackQtyLabel(targetBuybackQty);

  if (variant === "panel") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-extrabold">{price}</p>
        <p className="text-sm font-extrabold">{quantity}</p>
        <p className="text-xs font-bold text-muted-foreground">
          只供參考。希望回收數量已滿仍可收卡，今次收取價錢仍要自己填。
        </p>
      </div>
    );
  }

  return (
    <>
      <span className="block text-[10px] font-bold leading-snug text-muted-foreground">{price}</span>
      <span className="block text-[10px] font-bold leading-snug text-muted-foreground">{quantity}</span>
    </>
  );
}
