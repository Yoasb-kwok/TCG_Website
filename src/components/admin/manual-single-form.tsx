"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FORM_FIELD_INPUT_CLASS,
  SEARCH_BAR_SELECT_CLASS,
} from "@/lib/search-bar-styles";
import { cn } from "@/lib/utils";
import { useTaxonomy } from "@/providers/taxonomy-provider";

interface ManualSingleFormProps {
  onCreated: () => void;
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

export function ManualSingleForm({ onCreated }: ManualSingleFormProps) {
  const { optionsFor, loading: taxonomyLoading } = useTaxonomy();
  const setOptions = optionsFor("SET_CODE");
  const rarityOptions = optionsFor("RARITY");
  const categoryOptions = optionsFor("CARD_CATEGORY");
  const attributeOptions = optionsFor("POKEMON_ATTRIBUTE");

  // ADR-006: Game type selector
  const [gameTypes, setGameTypes] = useState<{ id: string; name: string }[]>([]);
  const [gameTypeId, setGameTypeId] = useState("");
  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((d: { id: string; name: string }[]) => {
        setGameTypes(d);
        if (d[0]) setGameTypeId(d[0].id);
      })
      .catch(() => setGameTypes([{ id: "00000000-0000-0000-0000-000000000001", name: "Pokémon" }]));
  }, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [setCode, setSetCode] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [rarityTier, setRarityTier] = useState("");
  const [cardCategory, setCardCategory] = useState("");
  const [pokemonType, setPokemonType] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [description, setDescription] = useState("");
  const [isFoil, setIsFoil] = useState(false);
  const [lowThreshold, setLowThreshold] = useState("");
  const [criticalThreshold, setCriticalThreshold] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cardNumberOptions = optionsFor("CARD_NUMBER", setCode || null);

  useEffect(() => {
    if (taxonomyLoading) return;
    if (!setCode && setOptions[0]) setSetCode(setOptions[0].value);
    if (!rarityTier && rarityOptions[0]) setRarityTier(rarityOptions[0].value);
    if (!cardCategory && categoryOptions[0])
      setCardCategory(categoryOptions[0].value);
  }, [
    taxonomyLoading,
    setOptions,
    rarityOptions,
    categoryOptions,
    setCode,
    rarityTier,
    cardCategory,
  ]);

  useEffect(() => {
    setCardNumber("");
  }, [setCode]);

  const onPickImage = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setName("");
    setCardNumber("");
    setPrice("");
    setStock("1");
    setDescription("");
    setIsFoil(false);
    setLowThreshold("");
    setCriticalThreshold("");
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!name.trim() || !setCode || !rarityTier || !price || !imageFile) {
      setError("請填寫卡牌名稱、系列、稀有度、售價並上傳圖片");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const imageUrl = await uploadImage(imageFile);
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "single",
          gameTypeId,
          name: name.trim(),
          setCode,
          cardNumber: cardNumber.trim() || undefined,
          rarityTier,
          cardCategory,
          pokemonType: pokemonType || undefined,
          price: Number(price),
          stock: Number(stock),
          description: description.trim() || undefined,
          imageUrl,
          isFoil,
        }),
      });
      const data = (await res.json()) as { error?: string; product?: { id: string; name: string; variants?: { id: string }[] } };
      if (!res.ok) throw new Error(data.error ?? "上架失敗");

      setSuccess(`已上架：${data.product?.name ?? name}`);

      // Set thresholds if provided (post-creation PATCH)
      const newProductId = data.product?.id;
      const newVariantId = data.product?.variants?.[0]?.id;
      if (
        newProductId &&
        newVariantId &&
        (lowThreshold.trim() || criticalThreshold.trim())
      ) {
        await fetch(`/api/admin/products/${newProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId: newVariantId,
            lowThreshold: lowThreshold.trim()
              ? Number(lowThreshold)
              : null,
            criticalThreshold: criticalThreshold.trim()
              ? Number(criticalThreshold)
              : null,
          }),
        });
      }

      resetForm();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上架失敗");
    } finally {
      setLoading(false);
    }
  };

  const showAttribute = cardCategory === "POKEMON";

  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <p className="text-xs text-muted-foreground">
        自行填寫卡牌資料並上傳圖片，無需連接外部 API。欄位內按 Enter 可提交上架。
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>遊戲</Label>
          <select
            value={gameTypeId}
            onChange={(e) => setGameTypeId(e.target.value)}
            className={cn("mt-1 w-full", SEARCH_BAR_SELECT_CLASS)}
          >
            {gameTypes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <Label>卡牌名稱 *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：皮卡丘 ex"
            className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
          />
        </div>

        <div>
          <Label>系列編號 *</Label>
          <select
            value={setCode}
            onChange={(e) => setSetCode(e.target.value)}
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
              此系列尚無卡號，請至「標籤管理」批次產生後再選擇
            </p>
          )}
        </div>

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

        <div>
          <Label>售價 (HKD) *</Label>
          <Input
            type="number"
            min={1}
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

        <div className="sm:col-span-2">
          <Label>備註（選填）</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
          />
        </div>

        <div className="flex items-end gap-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isFoil}
              onChange={(e) => setIsFoil(e.target.checked)}
              className="rounded"
            />
            閃卡 / 逆閃
          </label>
        </div>

        {/* Inventory threshold settings */}
        <div className="sm:col-span-2 rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            庫存水位設定（可選）
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            系統會保留緩衝庫存給門市客人。留空則使用全局預設值。
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">低水位</label>
              <input
                type="number"
                min={0}
                value={lowThreshold}
                onChange={(e) => setLowThreshold(e.target.value)}
                placeholder="留空使用預設"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">臨界水位</label>
              <input
                type="number"
                min={0}
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(e.target.value)}
                placeholder="留空使用預設"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label>卡牌圖片 *</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-pink-500/20 file:px-3 file:py-2 file:text-sm file:text-foreground"
          onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
        />
        {imagePreview && (
          <div className="relative mt-3 mx-auto aspect-[3/4] w-36">
            <Image
              src={imagePreview}
              alt="預覽"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        {!imagePreview && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
            支援 JPG / PNG / WebP，最大 5MB
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            上架中…
          </>
        ) : (
          "確認上架單卡"
        )}
      </Button>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}
    </form>
  );
}
