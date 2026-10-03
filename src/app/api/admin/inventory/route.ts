import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getVariantState } from "@/lib/inventory";

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return authCheck.response;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "請先設定 DATABASE_URL" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const setCode = searchParams.get("setCode") ?? undefined;
  const rarityTier = searchParams.get("rarityTier") ?? undefined;
  const stateFilter = searchParams.get("state") as "critical" | "low" | "healthy" | null;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  const productFilter: Record<string, unknown> = {};
  if (type) productFilter.type = type;
  if (setCode) productFilter.setCode = setCode;
  if (rarityTier) productFilter.rarityTier = rarityTier;
  if (search) {
    productFilter.name = { contains: search, mode: "insensitive" };
  }
  if (Object.keys(productFilter).length > 0) {
    where.product = productFilter;
  }

  const prisma = getPrisma();

  try {
    // Fetch global thresholds for state computation
    const shopSetting = await prisma.shopSetting.findUnique({
      where: { id: "default" },
    });
    const globalLow = shopSetting?.defaultLowThreshold ?? 5;
    const globalCritical = shopSetting?.defaultCriticalThreshold ?? 2;

    const [variants, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, type: true, setCode: true, rarityTier: true } },
        },
        orderBy: { stock: "asc" }, // low stock first, refine after state computation
        skip: 0, // fetch all, paginate after state filter
        take: 500, // cap at 500 variants for safety
      }),
      prisma.productVariant.count({ where }),
    ]);

    // Compute state for each variant
    const enriched = variants.map((v) => {
      const low = v.lowThreshold ?? globalLow;
      const critical = v.criticalThreshold ?? globalCritical;
      const state = getVariantState(v.stock, low, critical);
      return {
        id: v.id,
        productId: v.product.id,
        name: v.product.name,
        condition: v.condition,
        isFoil: v.isFoil,
        actual: v.stock,
        booked: v.bookedStock,
        reserved: v.reservedStock,
        total: v.stock + v.bookedStock + v.reservedStock,
        reservedNote: v.reservedNote,
        lowThreshold: v.lowThreshold,
        criticalThreshold: v.criticalThreshold,
        effectiveLow: low,
        effectiveCritical: critical,
        state,
      };
    });

    // Filter by state if requested
    const filtered = stateFilter
      ? enriched.filter((v) => v.state === stateFilter)
      : enriched;

    // Rank: critical → low → healthy
    const stateOrder = { critical: 0, low: 1, healthy: 2 };
    filtered.sort((a, b) => stateOrder[a.state] - stateOrder[b.state]);

    // Paginate after filtering
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      variants: paginated,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / pageSize),
      globalDefaults: { low: globalLow, critical: globalCritical },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, variants: [] }, { status: 500 });
  }
}
