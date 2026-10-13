import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { MAP_VIDEO_MAX_BYTES, MapVideoError, mapVideoStorageMode } from "@/lib/map-video";
import { clearMapVideo, readMapVideo, saveBlobMapVideo, saveLocalMapVideo } from "@/lib/map-video-storage";
import { isDatabaseConfigured } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

function storageMode() {
  return mapVideoStorageMode({
    blobToken: process.env.BLOB_READ_WRITE_TOKEN,
    vercel: process.env.VERCEL,
  });
}

function videoPayload(video: { url: string; filename: string } | null) {
  return video ? { url: video.url, filename: video.filename } : null;
}

function missingMapVideoColumn(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  return code === "P2021" || code === "P2022";
}

function failure(error: unknown) {
  if (error instanceof MapVideoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (missingMapVideoColumn(error)) {
    return NextResponse.json(
      { error: "地圖影片欄位未就緒，請先執行 npx prisma migrate deploy" },
      { status: 503 },
    );
  }
  console.error("map video request failed", error);
  return NextResponse.json({ error: "地圖影片處理失敗" }, { status: 500 });
}

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  try {
    const video = await readMapVideo();
    return NextResponse.json({
      storage: storageMode(),
      maxBytes: MAP_VIDEO_MAX_BYTES,
      database: isDatabaseConfigured(),
      video: videoPayload(video),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }
  if (storageMode() === "unconfigured") {
    return NextResponse.json(
      { error: "正式環境需要設定 BLOB_READ_WRITE_TOKEN，否則地圖影片無法保存。" },
      { status: 503 },
    );
  }
  if (storageMode() !== "local") {
    return NextResponse.json({ error: "此環境請使用 Vercel Blob 上傳" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "請選擇影片檔案" }, { status: 400 });
  }

  try {
    const video = await saveLocalMapVideo(file);
    revalidatePath("/about");
    return NextResponse.json({ video: videoPayload(video) });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  const body = (await request.json().catch(() => null)) as { url?: string; filename?: string } | null;
  if (!body?.url) {
    return NextResponse.json({ error: "缺少影片網址" }, { status: 400 });
  }

  try {
    const video = await saveBlobMapVideo({
      url: body.url,
      filename: body.filename ?? "",
    });
    revalidatePath("/about");
    return NextResponse.json({ video: videoPayload(video) });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  try {
    const result = await clearMapVideo();
    revalidatePath("/about");
    return NextResponse.json({
      video: null,
      ...(result.removed ? {} : { warning: "前台已清除，但儲存空間裡的檔案可能還在。" }),
    });
  } catch (error) {
    return failure(error);
  }
}
