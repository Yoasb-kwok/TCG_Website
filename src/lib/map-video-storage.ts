import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { Prisma } from "@/generated/prisma/client";
import {
  declaredMapVideoTypeAllowed,
  displayFilename,
  isBlobMapVideoUrl,
  isLocalMapVideoUrl,
  isPlayableMapVideoUrl,
  isSafeMapVideoPathname,
  MAP_VIDEO_MAX_BYTES,
  MapVideoError,
  mapVideoContentType,
  mapVideoStorageMode,
  mapVideoTooLargeMessage,
  sniffMapVideo,
  type MapVideoKind,
} from "@/lib/map-video";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { DEFAULT_ABOUT_CONTENT } from "@/lib/site-content";

export interface MapVideoRecord {
  url: string;
  filename: string;
  pathname: string;
}

function uploadsRoot(): string {
  return path.join(process.cwd(), "public", "uploads");
}

function storageMode() {
  return mapVideoStorageMode({
    blobToken: process.env.BLOB_READ_WRITE_TOKEN,
    vercel: process.env.VERCEL,
  });
}

export function resolveLocalMapVideoFile(pathname: string, root = uploadsRoot()): string | null {
  if (!isSafeMapVideoPathname(pathname)) return null;
  const base = path.resolve(root);
  const file = path.resolve(base, pathname);
  const folder = path.resolve(base, "map-video");
  if (!file.startsWith(folder + path.sep)) return null;
  return file;
}

async function readHeader(url: string): Promise<Uint8Array | null> {
  const response = await fetch(url, { headers: { Range: "bytes=0-31" } });
  if (!response.ok && response.status !== 206) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const { value } = await reader.read();
  await reader.cancel().catch(() => undefined);
  return value ?? null;
}

function contentTypeMatches(contentType: string, kind: MapVideoKind): boolean {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!type || type === "application/octet-stream") return true;
  return type === mapVideoContentType(kind);
}

async function removeStoredObject(video: { url: string; pathname: string }): Promise<boolean> {
  try {
    if (isLocalMapVideoUrl(video.url)) {
      const file = resolveLocalMapVideoFile(video.pathname);
      if (!file) return false;
      await unlink(file);
      return true;
    }
    if (isBlobMapVideoUrl(video.url)) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
      const { del } = await import("@vercel/blob");
      await del(video.url);
      return true;
    }
    return false;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return true;
    console.error("map video delete failed", error);
    return false;
  }
}

async function loadRow() {
  return getPrisma().aboutPageContent.findUnique({
    where: { id: "default" },
    select: { mapVideoUrl: true, mapVideoFilename: true, mapVideoPathname: true },
  });
}

function recordFromRow(row: {
  mapVideoUrl: string | null;
  mapVideoFilename: string | null;
  mapVideoPathname: string | null;
} | null): MapVideoRecord | null {
  if (!row?.mapVideoUrl || !row.mapVideoFilename || !row.mapVideoPathname) return null;
  if (!isPlayableMapVideoUrl(row.mapVideoUrl)) return null;
  return {
    url: row.mapVideoUrl,
    filename: row.mapVideoFilename,
    pathname: row.mapVideoPathname,
  };
}

async function persist(next: MapVideoRecord | null): Promise<{ record: MapVideoRecord | null; removedPrevious: boolean }> {
  if (!isDatabaseConfigured()) {
    throw new MapVideoError("請先設定 DATABASE_URL", 503);
  }
  const prisma = getPrisma();
  const existing = await loadRow();
  const previous = recordFromRow(existing);

  if (!existing && !next) return { record: null, removedPrevious: true };

  if (!existing && next) {
    const sections = DEFAULT_ABOUT_CONTENT.sections as unknown as Prisma.InputJsonValue;
    await prisma.aboutPageContent.create({
      data: {
        id: "default",
        pageTitle: DEFAULT_ABOUT_CONTENT.pageTitle,
        pageSubtitle: DEFAULT_ABOUT_CONTENT.pageSubtitle,
        sections,
        storeAddressZh: DEFAULT_ABOUT_CONTENT.storeAddressZh,
        storeAddressEn: DEFAULT_ABOUT_CONTENT.storeAddressEn,
        storeHours: DEFAULT_ABOUT_CONTENT.storeHours,
        storeMtr: DEFAULT_ABOUT_CONTENT.storeMtr,
        mapEmbedUrl: DEFAULT_ABOUT_CONTENT.mapEmbedUrl,
        contactBody: DEFAULT_ABOUT_CONTENT.contactBody,
        showStoreInfo: DEFAULT_ABOUT_CONTENT.showStoreInfo,
        mapVideoUrl: next.url,
        mapVideoFilename: next.filename,
        mapVideoPathname: next.pathname,
      },
    });
  } else {
    await prisma.aboutPageContent.update({
      where: { id: "default" },
      data: {
        mapVideoUrl: next?.url ?? null,
        mapVideoFilename: next?.filename ?? null,
        mapVideoPathname: next?.pathname ?? null,
      },
    });
  }

  let removedPrevious = true;
  if (previous && previous.url !== next?.url) {
    removedPrevious = await removeStoredObject(previous);
  }
  return { record: next, removedPrevious };
}

export async function readMapVideo(): Promise<MapVideoRecord | null> {
  if (!isDatabaseConfigured()) return null;
  return recordFromRow(await loadRow());
}

export async function clearMapVideo(): Promise<{ removed: boolean }> {
  const saved = await persist(null);
  return { removed: saved.removedPrevious };
}

export async function saveLocalMapVideo(file: File): Promise<MapVideoRecord> {
  if (storageMode() !== "local") {
    throw new MapVideoError("此環境請使用 Vercel Blob 上傳", 400);
  }
  if (!declaredMapVideoTypeAllowed(file.type)) {
    throw new MapVideoError("僅支援 MP4、WebM");
  }
  if (file.size <= 0) throw new MapVideoError("影片檔案是空的");
  if (file.size > MAP_VIDEO_MAX_BYTES) throw new MapVideoError(mapVideoTooLargeMessage());

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffMapVideo(bytes);
  if (!kind) throw new MapVideoError("僅支援 MP4、WebM");

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const pathname = `map-video/${id}.${kind}`;
  const dest = resolveLocalMapVideoFile(pathname);
  if (!dest) throw new MapVideoError("影片路徑不正確");

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);

  const record: MapVideoRecord = {
    url: `/uploads/${pathname}`,
    filename: displayFilename(file.name, kind),
    pathname,
  };
  try {
    await persist(record);
  } catch (error) {
    await unlink(dest).catch(() => undefined);
    throw error;
  }
  return record;
}

export async function saveBlobMapVideo(input: { url: string; filename: string }): Promise<MapVideoRecord> {
  if (storageMode() !== "blob") {
    throw new MapVideoError("未設定 BLOB_READ_WRITE_TOKEN", 503);
  }
  if (!isBlobMapVideoUrl(input.url)) {
    throw new MapVideoError("影片網址不正確");
  }

  const { del, head } = await import("@vercel/blob");
  let meta: Awaited<ReturnType<typeof head>>;
  try {
    meta = await head(input.url);
  } catch {
    throw new MapVideoError("找不到已上傳的影片");
  }

  const discard = async () => {
    if (isSafeMapVideoPathname(meta.pathname)) {
      await del(meta.url).catch(() => undefined);
    }
  };

  if (!isSafeMapVideoPathname(meta.pathname) || !isBlobMapVideoUrl(meta.url)) {
    throw new MapVideoError("影片路徑不正確");
  }
  if (meta.size <= 0) {
    await discard();
    throw new MapVideoError("影片檔案是空的");
  }
  if (meta.size > MAP_VIDEO_MAX_BYTES) {
    await discard();
    throw new MapVideoError(mapVideoTooLargeMessage());
  }

  const header = await readHeader(meta.url);
  const kind = header ? sniffMapVideo(header) : null;
  if (!kind || !contentTypeMatches(meta.contentType, kind)) {
    await discard();
    throw new MapVideoError("僅支援 MP4、WebM");
  }

  const record: MapVideoRecord = {
    url: meta.url,
    filename: displayFilename(input.filename, kind),
    pathname: meta.pathname,
  };

  let current: MapVideoRecord | null = null;
  try {
    current = await readMapVideo();
    if (current?.url === record.url && current.filename === record.filename) return current;
    await persist(record);
  } catch (error) {
    if (current?.url !== record.url) await discard();
    throw error;
  }
  return record;
}
