import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isSafeMapVideoPathname, MAP_VIDEO_MAX_BYTES, mapVideoContentType } from "@/lib/map-video";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "未設定 BLOB_READ_WRITE_TOKEN" }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isSafeMapVideoPathname(pathname)) {
          throw new Error("影片路徑不正確");
        }
        return {
          allowedContentTypes: [mapVideoContentType("mp4"), mapVideoContentType("webm")],
          maximumSizeInBytes: MAP_VIDEO_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "上傳失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
