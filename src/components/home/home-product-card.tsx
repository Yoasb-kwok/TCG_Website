"use client";

import Image from "next/image";
import Link from "next/link";
import { PRODUCT_TYPES } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import type { ProductWithVariants } from "@/lib/types";
import { useCart } from "@/providers/cart-provider";
import { homeCardShadow, homeDisabledButton, homePrimaryButton } from "@/components/home/home-layout";

/** Type lines copied from the homepage frame for the showcase slugs. */
const FRAME_TYPE_LINE: Record<string, string> = {
  "demo-charizard-sold-out": "單卡 · Scarlet & Violet—151",
  "demo-sleeves": "配件",
  "demo-umbreon-vmax-evolving": "SINGLE · Evolving Skies",
  "umbreon-vmax-evolving": "SINGLE · Evolving Skies",
  "demo-sv151-etb": "SEALED_BOX · Scarlet & Violet—151",
  "sv151-etb": "SEALED_BOX · Scarlet & Violet—151",
};

function typeLine(product: ProductWithVariants): string {
  const framed = FRAME_TYPE_LINE[product.slug];
  if (framed) return framed;
  const label = PRODUCT_TYPES.find((item) => item.value === product.type)?.label ?? product.type;
  return product.cardSet ? `${label} · ${product.cardSet}` : label;
}

export function HomeProductCard({ product }: { product: ProductWithVariants }) {
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
    <article
      className={`flex flex-col overflow-hidden rounded-[12px] border border-[rgba(221,213,195,0.9)] bg-[rgba(255,255,255,0.98)] ${homeCardShadow}`}
    >
      <div className="flex h-[300px] items-center justify-center bg-[#fbfaf6]">
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
          {product.rarity ? (
            <p className="text-[13px] leading-[1.6] text-[#625f58]">{product.rarity}</p>
          ) : null}
          <h3 className="line-clamp-2 min-h-[49px] text-[17px] font-medium leading-[1.45] text-[#0a0a09]">
            <Link href={href} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          <p className="text-[13px] leading-[1.6] text-[#625f58]">{typeLine(product)}</p>
          {details.length > 0 ? (
            <p className="flex gap-3 text-[13px] leading-[1.6] text-[#625f58]">
              {details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
            </p>
          ) : (
            <div className="h-2.5" aria-hidden="true" />
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[24px] font-medium leading-[1.2] text-[#0a0a09]">
            {cheapest && cheapest.price > 0 ? formatPrice(cheapest.price) : "未定價"}
          </p>
          <button
            type="button"
            disabled={!sellable}
            onClick={handleAdd}
            className={`${sellable ? homePrimaryButton : homeDisabledButton} w-[72px] px-0`}
          >
            加入
          </button>
        </div>
      </div>
    </article>
  );
}
