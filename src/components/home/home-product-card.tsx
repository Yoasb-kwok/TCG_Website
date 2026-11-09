"use client";

import Image from "next/image";
import Link from "next/link";
import { FoundationButton } from "@/components/foundations/button";
import { PRODUCT_TYPES } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import type { ProductWithVariants } from "@/lib/types";
import { useCart } from "@/providers/cart-provider";

/** Type lines copied from the homepage frame for the showcase slugs. */
const FRAME_TYPE_LINE: Record<string, string> = {
  "demo-charizard-sold-out": "單卡 · Scarlet & Violet—151",
  "demo-sleeves": "配件",
  "demo-umbreon-vmax-evolving": "SINGLE · Evolving Skies",
  "umbreon-vmax-evolving": "SINGLE · Evolving Skies",
  "demo-sv151-etb": "SEALED_BOX · Scarlet & Violet—151",
  "sv151-etb": "SEALED_BOX · Scarlet & Violet—151",
};

const HOLO_SWEEP =
  "linear-gradient(90deg, rgba(255, 89, 97, 0) 0%, rgba(255, 89, 97, 0.9) 18%, rgba(255, 235, 64, 0.95) 36%, rgba(89, 255, 199, 0.95) 54%, rgba(89, 168, 255, 0.95) 72%, rgba(209, 97, 255, 0.9) 88%, rgba(255, 89, 97, 0) 100%)";

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
    <article className="group flex flex-col overflow-hidden rounded-[12px] border border-[rgba(111,89,199,0.66)] bg-[rgba(255,255,255,0.96)] shadow-trtcg-card transition duration-300 hover:-translate-y-1 hover:border-white/60 hover:shadow-[0_0_20px_rgba(255,194,64,0.26),0_0_34px_rgba(89,184,255,0.42),0_24px_40px_rgba(0,0,0,0.34)]">
      <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(111,89,199,0.28)] bg-[rgba(230,223,255,0.88)]">
        {imageUrl ? (
          <Link
            href={href}
            className="relative z-[1] block h-[252px] w-[222px] transition duration-300 group-hover:-rotate-[1.4deg]"
          >
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[-40px] left-[-140px] h-[430px] w-[96px] rotate-[18deg] opacity-0 mix-blend-color-dodge transition-all duration-500 group-hover:left-[150px] group-hover:opacity-80"
          style={{ backgroundImage: HOLO_SWEEP }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 54% 59%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.18) 34%, rgba(0,0,0,0.28) 100%)",
          }}
        />
        <Image
          src="/brand/home/effect-sparkles.svg"
          alt=""
          width={302}
          height={300}
          unoptimized
          className="pointer-events-none absolute top-[-1px] left-[-1px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      </div>
      <div className="flex min-h-[280px] flex-col justify-between gap-3 p-5">
        <div className="flex flex-col gap-3">
          {product.rarity ? (
            <p className="text-[13px] leading-[1.6] text-trtcg-muted">{product.rarity}</p>
          ) : null}
          <h3 className="line-clamp-2 min-h-[49px] text-[17px] font-medium leading-[1.45] text-trtcg-ink">
            <Link href={href} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          <p className="text-[13px] leading-[1.6] text-trtcg-muted">{typeLine(product)}</p>
          {details.length > 0 ? (
            <p className="flex gap-3 text-[13px] leading-[1.6] text-trtcg-muted">
              {details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
            </p>
          ) : (
            <div className="h-2.5" aria-hidden="true" />
          )}
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
