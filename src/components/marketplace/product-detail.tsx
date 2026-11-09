"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { FoundationButton } from "@/components/foundations/button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePublicTaxonomy } from "@/hooks/use-public-taxonomy";
import { homeContainer } from "@/components/home/home-layout";
import { formatPrice } from "@/lib/format";
import { getProductTypeDisplayLabel } from "@/lib/product-type-display";
import type { ProductWithVariants } from "@/lib/types";
import { useCart } from "@/providers/cart-provider";
import { cn } from "@/lib/utils";

const LANGUAGE_LABELS: Record<string, string> = {
  "zh-HK": "繁體中文",
  "zh-TW": "繁體中文",
  en: "英文",
  ja: "日文",
};

interface ProductDetailProps {
  product: ProductWithVariants;
  catalogHref?: string;
  appearance?: "classic" | "frame";
}

function rarityPills(rarity: string | null | undefined): string[] {
  if (!rarity) return [];
  return rarity
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ProductDetail({
  product,
  catalogHref = "/products",
  appearance = "classic",
}: ProductDetailProps) {
  const { labelFor } = usePublicTaxonomy();
  const { addItem } = useCart();
  const [imageIndex, setImageIndex] = useState(0);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");

  const image = product.images[imageIndex] ?? product.images[0];
  const variant =
    product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  const inStock = Boolean(variant && variant.stock > 0);
  const purchasable = Boolean(variant && variant.stock > 0 && variant.price > 0);

  const meta = [
    getProductTypeDisplayLabel(product.type, labelFor),
    product.cardSet,
    product.cardNumber,
    LANGUAGE_LABELS[product.language] ?? product.language,
  ].filter(Boolean);

  const handleAdd = () => {
    if (!variant || !purchasable) return;
    addItem({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      imageUrl: product.images[0]?.url ?? null,
      condition: variant.condition,
      isFoil: variant.isFoil,
      price: variant.price,
      stock: variant.stock,
      sku: variant.sku,
    });
  };

  if (appearance === "frame") {
    const pills = rarityPills(product.rarity);
    return (
      <section className={`${homeContainer} flex flex-col gap-[36px] py-[64px] text-trtcg-ink`}>
        <FoundationButton variant="quiet" className="w-[160px]" render={<Link href={catalogHref} />}>
          ← 返回商品
        </FoundationButton>

        <div className="flex flex-col items-start gap-10 xl:flex-row xl:gap-[64px]">
          <div className="w-full xl:w-[608px] xl:shrink-0">
            <div className="flex min-h-[420px] w-full items-center justify-center rounded-[24px] bg-trtcg-surface p-6 shadow-trtcg-card sm:p-12 xl:h-[680px] xl:w-[608px]">
              {image ? (
                <div className="flex aspect-[440/580] w-full max-w-[440px] items-center justify-center">
                  <Image
                    src={image.url}
                    alt={image.alt || product.name}
                    width={440}
                    height={580}
                    className="h-full w-full object-contain"
                    unoptimized
                    preload
                  />
                </div>
              ) : (
                <div className="text-[14px] text-trtcg-muted">無圖片</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.images.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setImageIndex(index)}
                    className={cn(
                      "relative h-16 w-12 overflow-hidden rounded-[10px] border bg-white",
                      index === imageIndex ? "border-[#080808]" : "border-[#ddd5c3]",
                    )}
                    aria-label={`查看圖片 ${index + 1}`}
                  >
                    <Image
                      src={item.url}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="48px"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
            {pills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pills.map((label, index) => (
                  <Badge
                    key={label}
                    variant="foundation"
                    className={index === 0 ? "bg-trtcg-lavender" : undefined}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )}

            <h1 className="text-[40px] font-medium leading-[1.3] text-trtcg-ink">{product.name}</h1>
            {meta.length > 0 && (
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">
                {[
                  product.slug === "demo-charizard-sold-out" ? "單卡" : product.type,
                  product.cardSet,
                  product.cardNumber,
                  LANGUAGE_LABELS[product.language] ?? product.language,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {product.pokemonType && (
              <p className="text-[13px] leading-[1.6] text-trtcg-muted">{product.pokemonType}</p>
            )}
            {product.description && (
              <p className="whitespace-pre-line text-[16px] leading-[1.65] text-trtcg-ink">
                {product.description}
              </p>
            )}

            <div className="h-px w-full bg-trtcg-gold/55" />

            {variant ? (
              <div className="flex flex-col gap-4">
                <p className="text-[14px] font-medium leading-[1.45] text-trtcg-ink">品相</p>
                <div className="flex flex-col gap-3">
                  {product.variants.map((item) => {
                    const selected = item.id === variant.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setVariantId(item.id)}
                        className={cn(
                          "flex items-center justify-between gap-4 rounded-[16px] border bg-trtcg-surface p-5 text-left",
                          selected ? "border-trtcg-header" : "border-trtcg-line",
                        )}
                        aria-pressed={selected}
                      >
                        <span>
                          <span className="block text-[14px] font-medium leading-[1.45] text-trtcg-ink">
                            {item.condition}
                            {item.isFoil ? " · 閃卡" : ""}
                          </span>
                          <span className="mt-1 block text-[13px] leading-[1.6] text-trtcg-muted">
                            {item.stock > 0 ? `庫存 ${item.stock}` : "缺貨"}
                          </span>
                        </span>
                        <span className="text-[24px] font-medium leading-[1.2] text-trtcg-ink">
                          {item.price > 0 ? formatPrice(item.price) : "未定價"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col items-stretch gap-4 pt-2 sm:flex-row sm:items-center">
                  <p className="text-[40px] font-medium leading-[1.3] text-trtcg-ink">
                    {variant.price > 0 ? formatPrice(variant.price) : "未定價"}
                  </p>
                  <FoundationButton
                    type="button"
                    variant={purchasable ? "primary" : "disabled"}
                    onClick={handleAdd}
                    className="w-full max-w-[380px]"
                  >
                    {!inStock ? "缺貨" : variant.price > 0 ? "加入購物車" : "未定價"}
                  </FoundationButton>
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-trtcg-muted">暫時未能購買</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <Link href={catalogHref} className="text-sm text-muted-foreground hover:text-foreground">
        ← 返回商品
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div>
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted">
            {image ? (
              <Image
                src={image.url}
                alt={image.alt || product.name}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 480px"
                unoptimized
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                無圖片
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={cn(
                    "relative h-16 w-12 overflow-hidden rounded border bg-muted",
                    index === imageIndex ? "border-foreground" : "border-border",
                  )}
                  aria-label={`查看圖片 ${index + 1}`}
                >
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {(product.rarityTier || product.rarity) && (
              <Badge variant="secondary">
                {product.rarityTier
                  ? labelFor("RARITY", product.rarityTier)
                  : product.rarity}
              </Badge>
            )}
            {product.setCode && (
              <Badge className="bg-pink-500/90 text-white">
                {labelFor("SET_CODE", product.setCode)}
              </Badge>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold text-foreground">{product.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta.join(" · ")}</p>

          {(product.cardCategory || product.pokemonType) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                product.cardCategory && labelFor("CARD_CATEGORY", product.cardCategory),
                product.pokemonType && labelFor("POKEMON_ATTRIBUTE", product.pokemonType),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-foreground/80">
              {product.description}
            </p>
          )}

          {variant ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-foreground">品相</p>
              <div className="grid gap-2">
                {product.variants.map((item) => {
                  const selected = item.id === variant.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setVariantId(item.id)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                        selected
                          ? "border-foreground bg-muted"
                          : "border-border hover:bg-muted/60",
                      )}
                      aria-pressed={selected}
                    >
                      <span>
                        {item.condition}
                        {item.isFoil ? " · 閃卡" : ""}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.stock > 0 ? `庫存 ${item.stock}` : "缺貨"}
                        </span>
                      </span>
                      <span className="font-semibold">{item.price > 0 ? formatPrice(item.price) : "未定價"}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl font-semibold text-foreground">
                  {variant.price > 0 ? formatPrice(variant.price) : "未定價"}
                </span>
                <Button size="lg" disabled={!purchasable} onClick={handleAdd}>
                  <ShoppingCart className="h-4 w-4" />
                  {!inStock ? "缺貨" : variant.price > 0 ? "加入購物車" : "未定價"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">暫時未能購買</p>
          )}
        </div>
      </div>
    </div>
  );
}
