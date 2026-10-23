"use client";

import Image from "next/image";
import Link from "next/link";
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
    <article className={`flex flex-col overflow-hidden rounded-[16px] bg-white ${homeCardShadow}`}>
      <div className="flex h-[300px] items-center justify-center rounded-[10px] bg-[#fbfaf6]">
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
          <div className="text-[13px] text-[#625f58]">無圖片</div>
        )}
      </div>
      <div className="flex min-h-[280px] flex-col justify-between gap-3 p-5">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-[1.6] text-[#625f58]">{product.rarity || "OTHER"}</p>
          <h3 className="line-clamp-2 min-h-[49px] text-[17px] font-medium leading-[1.45] text-[#0a0a09]">
            <Link href={href}>{product.name}</Link>
          </h3>
          <p className="text-[13px] leading-[1.6] text-[#625f58]">{typeLine(product)}</p>
          <p className="flex min-h-[21px] gap-3 text-[13px] leading-[1.6] text-[#625f58]">
            {details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[24px] font-medium leading-[1.2] text-[#0a0a09]">
            {cheapest && cheapest.price > 0 ? formatPrice(cheapest.price) : "未定價"}
          </p>
          <button
            type="button"
            disabled={!sellable}
            onClick={handleAdd}
            className={
              sellable
                ? "inline-flex h-[48px] w-[72px] items-center justify-center rounded-[10px] border border-[#c8a24a] bg-[#080808] text-[14px] font-medium leading-[1.45] text-white transition hover:bg-[#1c1c1c]"
                : "inline-flex h-[48px] w-[72px] cursor-not-allowed items-center justify-center rounded-[10px] bg-[#d9d4c9] text-[14px] font-medium leading-[1.45] text-[#77736b]"
            }
          >
            加入
          </button>
        </div>
      </div>
    </article>
  );
}
