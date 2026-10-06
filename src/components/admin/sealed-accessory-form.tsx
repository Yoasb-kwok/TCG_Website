"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaxonomy } from "@/providers/taxonomy-provider";
import { filterSealedProductTypeOptions } from "@/lib/product-type-display";
import {
  FORM_FIELD_INPUT_CLASS,
  SEARCH_BAR_SELECT_CLASS,
} from "@/lib/search-bar-styles";
import { cn } from "@/lib/utils";

interface SealedAccessoryFormProps {
  onCreated: () => void;
  embedded?: boolean;
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

export function SealedAccessoryForm({ onCreated, embedded = false }: SealedAccessoryFormProps) {
  const { optionsFor, grouped } = useTaxonomy();
  const setOptions = optionsFor("SET_CODE");
  const sealedTypeOptions = useMemo(
    () => filterSealedProductTypeOptions(grouped.PRODUCT_TYPE),
    [grouped.PRODUCT_TYPE],
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"sealed" | "accessory">("sealed");
  const [productType, setProductType] = useState("");
  const [setCode, setSetCode] = useState("");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [accName, setAccName] = useState("");
  const [accDesc, setAccDesc] = useState("");
  const [accImageFile, setAccImageFile] = useState<File | null>(null);
  const accFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sealedTypeOptions.length === 0) return;
    if (!sealedTypeOptions.some((o) => o.value === productType)) {
      setProductType(sealedTypeOptions[0].value);
    }
  }, [sealedTypeOptions, productType]);

  const onPickImage = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSealedSubmit = async () => {
    if (!productName.trim() || !imageFile || !productType) {
      setError("請填寫商品名稱、商品類型並上傳圖片");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const imageUrl = await uploadImage(imageFile);
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "sealed",
          name: productName.trim(),
          type: productType,
          setCode: setCode || undefined,
          price: 0,
          stock: 0,
          description: description.trim() || undefined,
          imageUrl,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "建立失敗");
      setSuccess(`已上架：${productName}`);
      setProductName("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = "";
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleAccessorySubmit = async () => {
    if (!accName.trim()) {
      setError("請填寫商品名稱");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let imageUrl: string | undefined;
      if (accImageFile) {
        imageUrl = await uploadImage(accImageFile);
      }
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "accessory",
          name: accName.trim(),
          description: accDesc.trim() || undefined,
          price: 0,
          stock: 0,
          imageUrl,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "建立失敗");
      setSuccess(`已上架：${accName}`);
      setAccName("");
      setAccDesc("");
      setAccImageFile(null);
      if (accFileRef.current) accFileRef.current.value = "";
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("sealed")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            tab === "sealed"
              ? "bg-primary text-primary-foreground"
              : "bg-white/10 text-muted-foreground",
          )}
        >
          卡盒 / 補充包
        </button>
        <button
          type="button"
          onClick={() => setTab("accessory")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            tab === "accessory"
              ? "bg-primary text-primary-foreground"
              : "bg-white/10 text-muted-foreground",
          )}
        >
          週邊配件
        </button>
      </div>

      {tab === "sealed" ? (
        <form
          className={cn("space-y-4", !embedded && "rounded-xl border border-border bg-card p-6")}
          onSubmit={(e) => {
            e.preventDefault();
            void handleSealedSubmit();
          }}
        >
          <p className="text-xs text-muted-foreground">
            自行填寫卡盒或補充包資料並上傳商品圖片。按 Enter 可提交。
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>商品類型 *</Label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
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
            <div className="sm:col-span-2">
              <Label>商品名稱 *</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="例如：M3 補充包"
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
          </div>

          <div>
            <Label>商品圖片 *</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-pink-500/20 file:px-3 file:py-2 file:text-sm file:text-foreground"
              onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            />
            {imagePreview && (
              <div className="relative mt-3 h-24 w-40">
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
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <ImagePlus className="h-4 w-4" />
                支援 JPG / PNG / WebP，最大 5MB
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "上架卡盒/補充包"}
          </Button>
        </form>
      ) : (
        <form
          className={cn("space-y-4", !embedded && "rounded-xl border border-border bg-card p-6")}
          onSubmit={(e) => {
            e.preventDefault();
            void handleAccessorySubmit();
          }}
        >
          <div>
            <Label>商品名稱 *</Label>
            <Input
              placeholder="例如：卡套、骰子、牌組收納盒"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
            />
          </div>
          <div>
            <Label>描述（選填）</Label>
            <Input
              value={accDesc}
              onChange={(e) => setAccDesc(e.target.value)}
              className={cn("mt-1", FORM_FIELD_INPUT_CLASS)}
            />
          </div>
          <div>
            <Label>商品圖片（選填）</Label>
            <input
              ref={accFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-pink-500/20 file:px-3 file:py-2 file:text-sm file:text-foreground"
              onChange={(e) => setAccImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "上架週邊"}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}
    </div>
  );
}
