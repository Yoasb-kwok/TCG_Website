"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_HOME_SERVICES, type HomeServiceCardContent } from "@/lib/home-services";

export function HomeServicesEditor() {
  const [services, setServices] = useState<HomeServiceCardContent[]>(
    DEFAULT_HOME_SERVICES.map((service) => ({ ...service })),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/content/services");
        const data = (await res.json()) as { services?: HomeServiceCardContent[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "讀取服務卡失敗");
        if (data.services?.length) setServices(data.services);
      } catch (err) {
        setError(err instanceof Error ? err.message : "讀取服務卡失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (id: string, patch: Partial<HomeServiceCardContent>) => {
    setServices((prev) => prev.map((service) => (service.id === id ? { ...service, ...patch } : service)));
  };

  const upload = async (id: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    body.append("folder", "services");
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? "上傳失敗");
    update(id, { imageUrl: data.url });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/content/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "儲存服務卡失敗");
      setMessage("首頁服務卡已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存服務卡失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">載入服務卡...</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        上方圖片會取代原本的圖示。未改過的標題與內文會沿用現有文案；圖片留空則用預設寶可夢圖。
      </p>
      {error && <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      {message && (
        <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{message}</p>
      )}
      {services.map((service) => (
        <div key={service.id} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[180px_1fr]">
          <div className="relative h-28 overflow-hidden rounded-[12px] bg-muted">
            {service.imageUrl ? (
              <Image src={service.imageUrl} alt="" fill unoptimized className="object-cover" sizes="180px" />
            ) : null}
          </div>
          <div className="space-y-2">
            <Input value={service.title} onValueChange={(title) => update(service.id, { title })} placeholder="標題" />
            <textarea
              value={service.body}
              onChange={(event) => update(service.id, { body: event.target.value })}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            />
            <Input
              value={service.href}
              onValueChange={(href) => update(service.id, { href })}
              placeholder="站內連結，例如 /products?type=SINGLE"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm">
                <Upload className="h-4 w-4" />
                更換圖片
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) return;
                    void upload(service.id, file).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "上傳失敗");
                    });
                  }}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const fallback = DEFAULT_HOME_SERVICES.find((item) => item.id === service.id);
                  if (fallback) update(service.id, { imageUrl: fallback.imageUrl });
                }}
              >
                還原預設圖
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" onClick={() => void save()} disabled={saving}>
        儲存服務卡
      </Button>
    </div>
  );
}
