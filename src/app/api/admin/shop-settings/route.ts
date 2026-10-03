import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET() {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { defaultLowThreshold: 5, defaultCriticalThreshold: 2 },
      { status: 200 },
    );
  }

  const prisma = getPrisma();
  const setting = await prisma.shopSetting.findUnique({
    where: { id: "default" },
  });

  if (!setting) {
    // Auto-create singleton with defaults
    const created = await prisma.shopSetting.create({
      data: { id: "default" },
    });
    return NextResponse.json({
      defaultLowThreshold: created.defaultLowThreshold,
      defaultCriticalThreshold: created.defaultCriticalThreshold,
    });
  }

  return NextResponse.json({
    defaultLowThreshold: setting.defaultLowThreshold,
    defaultCriticalThreshold: setting.defaultCriticalThreshold,
  });
}

export async function PATCH(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const body = (await request.json()) as {
    defaultLowThreshold?: number;
    defaultCriticalThreshold?: number;
  };

  const prisma = getPrisma();

  // Get current values (or defaults)
  const current = await prisma.shopSetting.findUnique({
    where: { id: "default" },
  });

  const newLow = body.defaultLowThreshold ?? current?.defaultLowThreshold ?? 5;
  const newCritical =
    body.defaultCriticalThreshold ?? current?.defaultCriticalThreshold ?? 2;

  // Validate
  if (newCritical < 0) {
    return NextResponse.json(
      { error: "criticalThreshold cannot be negative" },
      { status: 400 },
    );
  }
  if (newLow <= newCritical) {
    return NextResponse.json(
      { error: "lowThreshold must be greater than criticalThreshold" },
      { status: 400 },
    );
  }

  const updated = await prisma.shopSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      defaultLowThreshold: newLow,
      defaultCriticalThreshold: newCritical,
    },
    update: {
      defaultLowThreshold: newLow,
      defaultCriticalThreshold: newCritical,
    },
  });

  return NextResponse.json({
    defaultLowThreshold: updated.defaultLowThreshold,
    defaultCriticalThreshold: updated.defaultCriticalThreshold,
  });
}
