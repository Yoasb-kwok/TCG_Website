"use client";

import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePublicTaxonomy } from "@/hooks/use-public-taxonomy";
import { getProductTypeDisplayLabel } from "@/lib/product-type-display";
import { formatPrice } from "@/lib/format";
import { POINTS_RATE } from "@/lib/points-constants";
import type { ProductWithVariants } from "@/lib/types";
import { useCart } from "@/providers/cart-provider";

interface ProductCardProps {
  product: ProductWithVariants;
}

export function ProductCard({ product }: ProductCardProps) {
  const { labelFor } = usePublicTaxonomy();
  const { addItem } = useCart();
  const cheapest = product.variants.reduce((min, v) =>
    v.price < min.price ? v : min,
  );
  const inStock = product.variants.some((v) => v.stock > 0);
  const totalStock = product.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
  const imageUrl = product.images[0]?.url;

  const handleAdd = () => {
    if (!inStock) return;
    const variant = product.variants.find((v) => v.stock > 0) ?? cheapest;
    addItem({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      imageUrl: imageUrl ?? null,
      condition: variant.condition,
      isFoil: variant.isFoil,
      price: variant.price,
      stock: variant.stock,
      sku: variant.sku,
    });
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-foreground/20">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-2 transition group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            無圖片
          </div>
        )}
        {(product.rarityTier || product.rarity) && (
          <Badge className="absolute left-2 top-2 max-w-[90%] truncate bg-background/80 text-[10px]">
            {product.rarityTier
              ? labelFor("RARITY", product.rarityTier)
              : product.rarity}
          </Badge>
        )}
        {product.setCode && (
          <Badge className="absolute right-2 top-2 bg-pink-500/90 text-[10px] text-white">
            {labelFor("SET_CODE", product.setCode)}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">
          {product.name}
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {getProductTypeDisplayLabel(product.type, labelFor)}
          {product.cardSet ? ` · ${product.cardSet}` : ""}
        </p>
        {product.cardNumber && (
          <p className="text-xs text-muted-foreground/80">{product.cardNumber}</p>
        )}
        {(product.cardCategory || product.pokemonType) && (
          <p className="text-xs text-muted-foreground/70">
            {[
              product.cardCategory && labelFor("CARD_CATEGORY", product.cardCategory),
              product.pokemonType &&
                labelFor("POKEMON_ATTRIBUTE", product.pokemonType),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <div>
            <span className="text-base font-semibold text-foreground">
              {formatPrice(cheapest.price)}
            </span>
            <p className="text-[10px] text-amber-600">
              賺 {Math.floor(cheapest.price * POINTS_RATE)} 分
            </p>
            <p className={`text-[10px] ${totalStock <= 3 ? "text-red-500" : "text-muted-foreground"}`}>
              {inStock ? `庫存 ${totalStock}` : "缺貨"}
            </p>
          </div>
          <Button size="sm" disabled={!inStock} onClick={handleAdd}>
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:inline">加入</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
