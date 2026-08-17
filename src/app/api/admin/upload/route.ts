import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth-server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Image upload for products/banners.
 *
 * Storage backend:
 * - Vercel (BLOB_READ_WRITE_TOKEN set): @vercel/blob — required because the
 *   Vercel serverless filesystem is read-only.
 * - Local dev (no token): writes to public/uploads/ (legacy behavior).
 */
export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = formData.get("folder");
    const folder = folderRaw === "banners" ? "banners" : "products";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "請選擇圖片檔案" }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "僅支援 JPG、PNG、WebP、GIF" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "圖片不得超過 5MB" }, { status: 400 });
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`${folder}/${filename}`, buffer, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    // Local dev fallback — writable filesystem
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${folder}/${filename}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "圖片上傳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
