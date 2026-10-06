"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MenuBannerEditor() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState("");
  const [title, setTitle] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/content/menu-banner")
      .then((res) => res.json())
      .then((data: { banner?: { image: string; href: string; title: string; active: boolean } }) => {
        const banner = data.banner;
        if (banner) {
          setImage(banner.image);
          setTitle(banner.title);
          setActive(banner.active);
        }
      })
      .catch(() => setError("未能載入商品選單 banner"))
      .finally(() => setLoading(false));
  }, []);

  const upload = async (file: File) => {
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "banners");
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      setError(data.error ?? "圖片上傳失敗");
      return;
    }
    setImage(data.url);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/content/menu-banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, title, active }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "儲存失敗");
        return;
      }
      setMessage("商品選單 banner 已儲存");
    } catch {
      setError("儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">載入中...</p>;

  return (
    <div className="max-w-xl space-y-4 rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">
        這張圖會顯示在頂部「商品」選單展開後的右側。
      </p>
      <div>
        <Label>圖片</Label>
        <Input value={image} onValueChange={setImage} placeholder="圖片網址" className="mt-1" />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" />
          上傳圖片
        </Button>
      </div>
      {image && (
        <div className="relative aspect-[16/7] overflow-hidden rounded-lg border border-border">
          <Image src={image} alt={title || "商品選單 banner"} fill className="object-cover" unoptimized />
        </div>
      )}
      <div>
        <Label>說明（選填，用作圖片替代文字）</Label>
        <Input value={title} onValueChange={setTitle} className="mt-1" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
        在商品選單顯示
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? "儲存中..." : "儲存商品選單 Banner"}
      </Button>
    </div>
  );
}
