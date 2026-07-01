import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth-server";
import { DEFAULT_ABOUT_CONTENT } from "@/lib/site-content";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

interface AboutSectionInput {
  id: string;
  title: string;
  body: string;
}

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ...DEFAULT_ABOUT_CONTENT, fallback: true });
  }

  const prisma = getPrisma();
  const row = await prisma.aboutPageContent.findUnique({ where: { id: "default" } });

  if (!row) {
    return NextResponse.json({ ...DEFAULT_ABOUT_CONTENT, fallback: true });
  }

  return NextResponse.json({
    pageTitle: row.pageTitle,
    pageSubtitle: row.pageSubtitle,
    sections: row.sections,
    storeAddressZh: row.storeAddressZh ?? "",
    storeAddressEn: row.storeAddressEn ?? "",
    storeHours: row.storeHours ?? "",
    storeMtr: row.storeMtr ?? "",
    mapEmbedUrl: row.mapEmbedUrl ?? "",
    contactBody: row.contactBody,
    showStoreInfo: row.showStoreInfo,
    fallback: false,
  });
}

export async function PUT(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json()) as {
    pageTitle?: string;
    pageSubtitle?: string;
    sections?: AboutSectionInput[];
    storeAddressZh?: string;
    storeAddressEn?: string;
    storeHours?: string;
    storeMtr?: string;
    mapEmbedUrl?: string;
    contactBody?: string;
    showStoreInfo?: boolean;
  };

  const pageTitle = body.pageTitle?.trim() ?? "";
  const pageSubtitle = body.pageSubtitle?.trim() ?? "";
  const contactBody = body.contactBody?.trim() ?? "";
  const sections = Array.isArray(body.sections) ? body.sections : [];

  if (!pageTitle || !pageSubtitle || !contactBody) {
    return NextResponse.json({ error: "標題、副標與聯絡資訊為必填" }, { status: 400 });
  }

  for (const section of sections) {
    if (!section.title?.trim() || !section.body?.trim()) {
      return NextResponse.json({ error: "區塊標題與內容不可留空" }, { status: 400 });
    }
  }
  const sectionsJson = sections as unknown as Prisma.InputJsonValue;

  const prisma = getPrisma();
  await prisma.aboutPageContent.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      pageTitle,
      pageSubtitle,
      sections: sectionsJson,
      storeAddressZh: body.storeAddressZh?.trim() ?? "",
      storeAddressEn: body.storeAddressEn?.trim() ?? "",
      storeHours: body.storeHours?.trim() ?? "",
      storeMtr: body.storeMtr?.trim() ?? "",
      mapEmbedUrl: body.mapEmbedUrl?.trim() ?? "",
      contactBody,
      showStoreInfo: body.showStoreInfo ?? true,
    },
    update: {
      pageTitle,
      pageSubtitle,
      sections: sectionsJson,
      storeAddressZh: body.storeAddressZh?.trim() ?? "",
      storeAddressEn: body.storeAddressEn?.trim() ?? "",
      storeHours: body.storeHours?.trim() ?? "",
      storeMtr: body.storeMtr?.trim() ?? "",
      mapEmbedUrl: body.mapEmbedUrl?.trim() ?? "",
      contactBody,
      showStoreInfo: body.showStoreInfo ?? true,
    },
  });

  revalidatePath("/about");

  return NextResponse.json({ ok: true });
}
