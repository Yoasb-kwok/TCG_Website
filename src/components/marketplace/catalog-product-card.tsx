"use client";

import Image from "next/image";
import Link from "next/link";
import { FoundationButton } from "@/components/foundations/button";
import { homeCardShadow } from "@/components/home/home-layout";
import { formatPrice } from "@/lib/format";
import type { ProductWithVariants } from "@/lib/types";
import { useCart } from "@/providers/cart-provider";

const TYPE_LINE: Record<string, string> = {
  "demo-charizard-sold-out": "SINGLE · Scarlet & Violet—151",
  "demo-sleeves": "ACCESSORY",
  "umbreon-vmax-evolving": "SINGLE · Evolving Skies",
  "demo-umbreon-vmax-evolving": "SINGLE · Evolving Skies",
  "sv151-etb": "SEALED_BOX · Scarlet & Violet—151",
  "demo-sv151-etb": "SEALED_BOX · Scarlet & Violet—151",
  "sv151-booster": "BOOSTER_PACK · Scarlet & Violet—151",
  "demo-sv151-booster": "BOOSTER_PACK · Scarlet & Violet—151",
  "pikachu-151": "SINGLE · Scarlet & Violet—151",
  "demo-pikachu-151": "SINGLE · Scarlet & Violet—151",
  "mew-ex-151": "SINGLE · Scarlet & Violet—151",
  "demo-mew-ex-151": "SINGLE · Scarlet & Violet—151",
  "charizard-ex-151": "SINGLE · Scarlet & Violet—151",
  "demo-charizard-ex-151": "SINGLE · Scarlet & Violet—151",
};

function typeLine(product: ProductWithVariants): string {
  return TYPE_LINE[product.slug] ?? (product.cardSet ? `${product.type} · ${product.cardSet}` : product.type);
}

export function CatalogProductCard({ product }: { product: ProductWithVariants }) {
  const { addItem } = useCart();
  const priced = product.variants.filter((variant) => variant.price > 0);
  const pool = priced.length > 0 ? priced : product.variants;
  const cheapest = pool.length
    ? pool.reduce((min, variant) => (variant.price < min.price ? variant : min))
    : null;
  const sellable = product.variants.find((variant) => variant.stock > 0 && variant.price > 0);
  const imageUrl = product.images[0]?.url;
  const href = `/products/${product.slug}`;
  const details = [product.cardNumber, product.pokemonType].filter(Boolean);

  const handleAdd = () => {
    if (!sellable) return;
    addItem({
      variantId: sellable.id,
      productId: product.id,
      name: product.name,
      imageUrl: imageUrl ?? null,
      condition: sellable.condition,
      isFoil: sellable.isFoil,
      price: sellable.price,
      stock: sellable.stock,
      sku: sellable.sku,
    });
  };

  return (
    <article className={`flex flex-col overflow-hidden rounded-[12px] border border-trtcg-line/80 bg-white ${homeCardShadow}`}>
      <div className="flex h-[300px] items-center justify-center rounded-[10px] bg-trtcg-surface">
        {imageUrl ? (
          <Link href={href} className="block h-[252px] w-[222px]">
            <Image
              src={imageUrl}
              alt={product.images[0]?.alt || product.name}
              width={222}
              height={252}
              className="h-[252px] w-[222px] object-contain"
              unoptimized
            />
          </Link>
        ) : (
          <div className="text-[13px] text-trtcg-muted">無圖片</div>
        )}
      </div>
      <div className="flex min-h-[280px] flex-col justify-between gap-3 p-5">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-[1.6] text-trtcg-muted">{product.rarity || "OTHER"}</p>
          <h3 className="line-clamp-2 min-h-[49px] text-[17px] font-medium leading-[1.45] text-trtcg-ink">
            <Link href={href}>{product.name}</Link>
          </h3>
          <p className="text-[13px] leading-[1.6] text-trtcg-muted">{typeLine(product)}</p>
          <p className="flex min-h-[21px] gap-3 text-[13px] leading-[1.6] text-trtcg-muted">
            {details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[24px] font-medium leading-[1.2] text-trtcg-ink">
            {cheapest && cheapest.price > 0 ? formatPrice(cheapest.price) : "未定價"}
          </p>
          <FoundationButton
            type="button"
            variant={sellable ? "primary" : "disabled"}
            onClick={handleAdd}
            className="w-[72px] px-0"
          >
            加入
          </FoundationButton>
        </div>
      </div>
    </article>
  );
}
