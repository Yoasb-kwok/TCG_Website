"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createMapVideoPathname,
  declaredMapVideoTypeAllowed,
  MAP_VIDEO_ACCEPT,
  MAP_VIDEO_MAX_BYTES,
  MAP_VIDEO_PLACEHOLDER,
  formatMapVideoMaxSize,
  mapVideoContentType,
  mapVideoTooLargeMessage,
  sniffMapVideo,
  type MapVideoKind,
  type MapVideoStorageMode,
} from "@/lib/map-video";

interface StoredVideo {
  url: string;
  filename: string;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function MapVideoEditor() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<MapVideoStorageMode>("local");
  const [database, setDatabase] = useState(true);
  const [video, setVideo] = useState<StoredVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/content/map-video");
        const data = await readJson<{
          storage?: MapVideoStorageMode;
          database?: boolean;
          video?: StoredVideo | null;
          error?: string;
        }>(response);
        if (!response.ok) throw new Error(data.error ?? "讀取地圖影片失敗");
        if (cancelled) return;
        setStorage(data.storage ?? "local");
        setDatabase(data.database !== false);
        setVideo(data.video ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "讀取地圖影片失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const inspectFile = async (file: File): Promise<MapVideoKind> => {
    if (!declaredMapVideoTypeAllowed(file.type)) throw new Error("僅支援 MP4、WebM");
    if (file.size <= 0) throw new Error("影片檔案是空的");
    if (file.size > MAP_VIDEO_MAX_BYTES) throw new Error(mapVideoTooLargeMessage());
    const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const kind = sniffMapVideo(header);
    if (!kind) throw new Error("僅支援 MP4、WebM");
    return kind;
  };

  const uploadLocal = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/admin/content/map-video", { method: "POST", body: form });
    const data = await readJson<{ video?: StoredVideo; error?: string }>(response);
    if (!response.ok || !data.video) throw new Error(data.error ?? "上傳失敗");
    return data.video;
  };

  const uploadBlob = async (file: File, kind: MapVideoKind) => {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(createMapVideoPathname(kind), file, {
      access: "public",
      handleUploadUrl: "/api/admin/content/map-video/client",
      contentType: mapVideoContentType(kind),
      multipart: file.size > 4 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
    });
    const response = await fetch("/api/admin/content/map-video", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: blob.url, filename: file.name }),
    });
    const data = await readJson<{ video?: StoredVideo; error?: string }>(response);
    if (!response.ok || !data.video) throw new Error(data.error ?? "上傳失敗");
    return data.video;
  };

  const onFile = async (file: File) => {
    setBusy(true);
    setProgress(null);
    setMessage(null);
    setError(null);
    try {
      const kind = await inspectFile(file);
      const saved = storage === "blob" ? await uploadBlob(file, kind) : await uploadLocal(file);
      setVideo(saved);
      setMessage("地圖影片已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clear = async () => {
    if (!video) return;
    if (!window.confirm("清除門市路線影片？前台會改回顯示「地圖影片稍後上載」。")) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/content/map-video", { method: "DELETE" });
      const data = await readJson<{ error?: string; warning?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "清除失敗");
      setVideo(null);
      setMessage(data.warning ?? "已清除地圖影片");
    } catch (err) {
      setError(err instanceof Error ? err.message : "清除失敗");
    } finally {
      setBusy(false);
    }
  };

  const uploadDisabled = busy || !database || storage === "unconfigured";

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium">門市地圖影片</p>
        <p className="mt-1 text-sm text-muted-foreground">
          上傳後顯示在關於我們的「門市路線」。未上傳時前台只顯示「{MAP_VIDEO_PLACEHOLDER}」，不會出現空白播放器。支援 MP4、WebM，最大 {formatMapVideoMaxSize()}。上傳、更換或清除會立即儲存。
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">載入中...</p>
      ) : (
        <>
          {storage === "local" && (
            <p className="text-xs text-muted-foreground">開發環境：影片存在本機 public/uploads/map-video/。</p>
          )}
          {storage === "blob" && (
            <p className="text-xs text-muted-foreground">影片會上傳至 Vercel Blob，前台可直接播放。</p>
          )}
          {storage === "unconfigured" && (
            <p className="text-sm text-red-400">正式環境需要設定 BLOB_READ_WRITE_TOKEN，否則地圖影片無法保存。</p>
          )}
          {!database && <p className="text-sm text-red-400">請先設定 DATABASE_URL</p>}

          {video ? (
            <div className="space-y-2">
              <p className="text-sm">
                檔名：<span className="font-medium text-foreground">{video.filename}</span>
              </p>
              <p className="break-all text-xs text-muted-foreground">
                播放網址：{" "}
                <a href={video.url} className="underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
                  {video.url}
                </a>
              </p>
              <video controls preload="metadata" playsInline className="aspect-video w-full rounded-lg bg-black" src={video.url}>
                您的瀏覽器不支援影片播放。
              </video>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">尚未上傳影片</p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={MAP_VIDEO_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploadDisabled} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" />
              {busy ? (progress === null ? "上傳中..." : `上傳中... ${progress}%`) : video ? "更換影片" : "上傳影片"}
            </Button>
            {video && (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void clear()}>
                <Trash2 className="mr-1 h-4 w-4" />
                清除影片
              </Button>
            )}
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
    </div>
  );
}
