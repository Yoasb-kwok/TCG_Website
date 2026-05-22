"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FORM_FIELD_INPUT_CLASS,
  SEARCH_BAR_SELECT_CLASS,
} from "@/lib/search-bar-styles";
import {
  filterSealedProductTypeOptions,
  getProductTypeDisplayLabel,
  isCardPackProductType,
  isSingleProductType,
} from "@/lib/product-type-display";
import { cn } from "@/lib/utils";
import { useTaxonomy } from "@/providers/taxonomy-provider";
import type { AdminProduct } from "@/components/admin/products-table";

interface ProductEditDialogProps {
  product: AdminProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "圖片上傳失敗");
  }
  return data.url;
}

export function ProductEditDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: ProductEditDialogProps) {
  const { optionsFor, labelFor, grouped } = useTaxonomy();
  const setOptions = optionsFor("SET_CODE");
  const sealedTypeOptions = filterSealedProductTypeOptions(
    grouped.PRODUCT_TYPE,
  );
  const rarityOptions = optionsFor("RARITY");
  const categoryOptions = optionsFor("CARD_CATEGORY");
  const attributeOptions = optionsFor("POKEMON_ATTRIBUTE");
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [setCode, setSetCode] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [rarityTier, setRarityTier] = useState("");
  const [cardCategory, setCardCategory] = useState("");
  const [pokemonType, setPokemonType] = useState("");
  const [sealedType, setSealedType] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [isFoil, setIsFoil] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardNumberOptions = optionsFor("CARD_NUMBER", setCode || null);

  useEffect(() => {
    if (!product || !open) return;
    const v = product.variants[0];
    setName(product.name);
    setSetCode(product.setCode ?? product.cardSet ?? "");
    setCardNumber(product.cardNumber ?? "");
    setRarityTier(product.rarityTier ?? "");
    setCardCategory(product.cardCategory ?? "");
    setPokemonType(product.pokemonType ?? "");
    if (isCardPackProductType(product.type)) {
      setSealedType(product.type);
    } else {
      setSealedType("");
    }
    setPrice(v ? String(v.price) : "");
    setStock(v ? String(v.stock) : "");
    setDescription(product.description ?? "");
    setIsFoil(v?.isFoil ?? false);
    setImagePreview(product.images[0]?.url ?? null);
    setImageFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [product, open]);

  const onPickImage = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!product?.variants[0]) return;
    const v = product.variants[0];

    if (!name.trim() || !price || stock === "") {
      setError("請填寫名稱、售價與庫存");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const base = {
        variantId: v.id,
        name: name.trim(),
        price: Number(price),
        stock: Number(stock),
        description: description.trim() || undefined,
        ...(imageUrl ? { imageUrl } : {}),
      };

      let body: Record<string, unknown>;

      if (isSingleProductType(product.type)) {
        if (!setCode || !rarityTier || !cardCategory) {
          setError("請填寫系列、稀有度與類型");
          setLoading(false);
          return;
        }
        body = {
          ...base,
          setCode,
          cardNumber: cardNumber.trim() || undefined,
          rarityTier,
          cardCategory,
          pokemonType: pokemonType || undefined,
          isFoil,
        };
      } else if (isCardPackProductType(product.type)) {
        if (!sealedType) {
          setError("請選擇商品類型");
          setLoading(false);
          return;
        }
        body = {
          ...base,
          type: sealedType,
          setCode: setCode || undefined,
        };
      } else {
        body = base;
      }

      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "更新失敗");

      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setLoading(false);
    }
  };

  const typeLabel = product?.type
    ? getProductTypeDisplayLabel(product.type, labelFor)
    : "";

  const showAttribute = cardCategory === "POKEMON";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>編輯商品</DialogTitle>
          <DialogDescription>
            {typeLabel}
            {product?.name ? ` · ${product.name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label>名稱 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
            />
          </div>

          {product && isSingleProductType(product.type) && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>系列編號 *</Label>
                  <select
                    value={setCode}
                    onChange={(e) => {
                      setSetCode(e.target.value);
                      setCardNumber("");
                    }}
                    className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
                  >
                    {setOptions.map((s) => (
                      <option key={s.id} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>卡號（選填）</Label>
                  {cardNumberOptions.length > 0 ? (
                    <select
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
                    >
                      <option value="">—</option>
                      {cardNumberOptions.map((n) => (
                        <option key={n.id} value={n.value}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      此系列尚無卡號
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>稀有度 *</Label>
                  <select
                    value={rarityTier}
                    onChange={(e) => setRarityTier(e.target.value)}
                    className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
                  >
                    {rarityOptions.map((r) => (
                      <option key={r.id} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>類型 *</Label>
                  <select
                    value={cardCategory}
                    onChange={(e) => setCardCategory(e.target.value)}
                    className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {showAttribute && (
                <div>
                  <Label>屬性</Label>
                  <select
                    value={pokemonType}
                    onChange={(e) => setPokemonType(e.target.value)}
                    className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
                  >
                    <option value="">—</option>
                    {attributeOptions.map((a) => (
                      <option key={a.id} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isFoil}
                  onChange={(e) => setIsFoil(e.target.checked)}
                  className="rounded"
                />
                閃卡 / 逆閃
              </label>
            </>
          )}

          {product && isCardPackProductType(product.type) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>商品類型</Label>
                <select
                  value={sealedType}
                  onChange={(e) => setSealedType(e.target.value)}
                  className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
                >
                  {sealedTypeOptions.map((t) => (
                    <option key={t.id} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>系列編號（選填）</Label>
                <select
                  value={setCode}
                  onChange={(e) => setSetCode(e.target.value)}
                  className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
                >
                  <option value="">—</option>
                  {setOptions.map((s) => (
                    <option key={s.id} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>售價 (HKD) *</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
              />
            </div>
            <div>
              <Label>庫存 *</Label>
              <Input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
              />
            </div>
          </div>

          <div>
            <Label>備註（選填）</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
            />
          </div>

          <div>
            <Label>商品圖片</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-pink-500/20 file:px-3 file:py-2 file:text-sm file:text-foreground"
              onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            />
            {imagePreview && (
              <div className="relative mt-3 mx-auto aspect-[3/4] w-28">
                <Image
                  src={imagePreview}
                  alt="預覽"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              不上傳則保留原圖
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  儲存中…
                </>
              ) : (
                "儲存"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
