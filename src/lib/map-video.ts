export const MAP_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const MAP_VIDEO_PLACEHOLDER = "地圖影片稍後上載";
export const MAP_VIDEO_ACCEPT = "video/mp4,video/webm,.mp4,.webm";

const DECLARED_TYPES = new Set(["", "application/octet-stream", "video/mp4", "video/webm"]);
const BLOB_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;

export type MapVideoKind = "mp4" | "webm";
export type MapVideoStorageMode = "blob" | "local" | "unconfigured";

export function formatMapVideoMaxSize(): string {
  return `${Math.round(MAP_VIDEO_MAX_BYTES / (1024 * 1024))}MB`;
}

export function mapVideoTooLargeMessage(): string {
  return `影片不得超過 ${formatMapVideoMaxSize()}`;
}

export function mapVideoContentType(kind: MapVideoKind): "video/mp4" | "video/webm" {
  return kind === "mp4" ? "video/mp4" : "video/webm";
}

export function declaredMapVideoTypeAllowed(type: string): boolean {
  return DECLARED_TYPES.has(type.trim().toLowerCase());
}

/** ISO BMFF `ftyp` at byte 4, or a WebM EBML header. */
export function sniffMapVideo(bytes: Uint8Array): MapVideoKind | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "webm";
  }
  if (bytes.length >= 8) {
    const box = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (box === "ftyp") return "mp4";
  }
  return null;
}

export function displayFilename(original: string, kind: MapVideoKind): string {
  const base = original.split(/[/\\]/).pop() ?? "";
  const cleaned = base.replace(/[^\w.\- ()\u4e00-\u9fff]+/g, "").trim();
  const stem = cleaned.replace(/\.(mp4|webm|mov)$/i, "").slice(0, 120).trim();
  return `${stem || "map-video"}.${kind}`;
}

export function createMapVideoPathname(kind: MapVideoKind): string {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `map-video/${id}.${kind}`;
}

export function isSafeMapVideoPathname(pathname: string): boolean {
  if (!pathname.startsWith("map-video/")) return false;
  const name = pathname.slice("map-video/".length);
  if (!name || name.length > 180) return false;
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return false;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return false;
  return /\.(mp4|webm)$/i.test(name);
}

export function isLocalMapVideoUrl(url: string): boolean {
  if (!url.startsWith("/uploads/map-video/")) return false;
  if (url.includes("?") || url.includes("#") || url.includes("\\") || url.includes("..")) return false;
  return isSafeMapVideoPathname(url.slice("/uploads/".length));
}

export function isBlobMapVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (!BLOB_HOST.test(parsed.hostname)) return false;
    const pathname = decodeURIComponent(parsed.pathname).replace(/^\//, "");
    return isSafeMapVideoPathname(pathname);
  } catch {
    return false;
  }
}

export function isPlayableMapVideoUrl(url: string): boolean {
  return isLocalMapVideoUrl(url) || isBlobMapVideoUrl(url);
}

export function videoSourceType(url: string): "video/mp4" | "video/webm" {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return path.endsWith(".webm") ? "video/webm" : "video/mp4";
}

export function mapVideoStorageMode(env: {
  blobToken?: string | null;
  vercel?: string | null;
}): MapVideoStorageMode {
  if (env.blobToken) return "blob";
  if (env.vercel) return "unconfigured";
  return "local";
}

export class MapVideoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MapVideoError";
    this.status = status;
  }
}
