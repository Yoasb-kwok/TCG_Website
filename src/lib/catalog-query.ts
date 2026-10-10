import { formatReleaseDate, splitMissingFields } from "@/lib/catalog-csv";
import { productSearchNeedles } from "@/lib/product-search";
import { getPrisma } from "@/lib/prisma";

const contains = (needle: string) => ({ contains: needle, mode: "insensitive" as const });

export interface CatalogCardDto {
  id: string;
  setCode: string;
  setNameZhTw: string | null;
  setNameJa: string | null;
  setNameEn: string | null;
  collectorNumber: string;
  altCollectorNumber: string | null;
  sortIndex: number;
  nameZhTw: string | null;
  nameJa: string | null;
  nameEn: string | null;
  imageUrl: string | null;
  imageUrlJa: string | null;
  rarity: string | null;
  illustrator: string | null;
  regulationMark: string | null;
  pendingTranslation: boolean;
  missingFields: string[];
}

export interface CatalogSetDto {
  code: string;
  nameZhTw: string | null;
  nameJa: string | null;
  nameEn: string | null;
  releaseDate: string | null;
  regulationMark: string | null;
  officialUrl: string | null;
  totalCards: number;
  pendingTranslationCount: number;
  updatedAt: string;
}

export interface CatalogChangelogDto {
  id: string;
  date: string;
  setCode: string;
  note: string;
}

export function pageWindow(rawPage: string | null, rawSize: string | null, fallbackSize = 50) {
  const parsedPage = Number(rawPage ?? "1");
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const parsedSize = Number(rawSize ?? String(fallbackSize));
  const pageSize = Number.isFinite(parsedSize)
    ? Math.min(200, Math.max(1, Math.floor(parsedSize)))
    : fallbackSize;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function cardSearchOr(raw: string): Record<string, unknown>[] {
  return productSearchNeedles(raw).flatMap((needle) => {
    const filter = contains(needle);
    return [
      { nameZhTw: filter },
      { nameJa: filter },
      { nameEn: filter },
      { collectorNumber: filter },
      { altCollectorNumber: filter },
      { rarity: filter },
      { illustrator: filter },
      { set: { code: filter } },
      { set: { nameZhTw: filter } },
      { set: { nameJa: filter } },
      { set: { nameEn: filter } },
    ];
  });
}

function numberOr(raw: string): Record<string, unknown>[] {
  return productSearchNeedles(raw).flatMap((needle) => {
    const filter = contains(needle);
    return [{ collectorNumber: filter }, { altCollectorNumber: filter }];
  });
}

export async function listCatalogSets(rawSearch?: string | null): Promise<CatalogSetDto[]> {
  const prisma = getPrisma();
  const and: Record<string, unknown>[] = [];
  const search = rawSearch?.trim() ?? "";
  if (search) {
    const or = productSearchNeedles(search).flatMap((needle) => {
      const filter = contains(needle);
      return [{ code: filter }, { nameZhTw: filter }, { nameJa: filter }, { nameEn: filter }];
    });
    if (or.length > 0) and.push({ OR: or });
  }

  const sets = await prisma.catalogSet.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: [{ releaseDate: "desc" }, { code: "asc" }],
    include: { _count: { select: { cards: true } } },
  });
  const pending =
    sets.length === 0
      ? []
      : await prisma.catalogCard.groupBy({
          by: ["setId"],
          where: { pendingTranslation: true, setId: { in: sets.map((set) => set.id) } },
          _count: { _all: true },
        });
  const pendingBySet = new Map(pending.map((row) => [row.setId, row._count._all]));

  return sets.map((set) => ({
    code: set.code,
    nameZhTw: set.nameZhTw,
    nameJa: set.nameJa,
    nameEn: set.nameEn,
    releaseDate: formatReleaseDate(set.releaseDate),
    regulationMark: set.regulationMark,
    officialUrl: set.officialUrl,
    totalCards: set._count.cards,
    pendingTranslationCount: pendingBySet.get(set.id) ?? 0,
    updatedAt: set.updatedAt.toISOString(),
  }));
}

export async function listCatalogCards(input: {
  setCode?: string | null;
  number?: string | null;
  search?: string | null;
  pendingOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ cards: CatalogCardDto[]; total: number; page: number; pageSize: number }> {
  const prisma = getPrisma();
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 50;
  const and: Record<string, unknown>[] = [];

  const setCode = input.setCode?.trim() ?? "";
  if (setCode) {
    and.push({ set: { code: { equals: setCode, mode: "insensitive" } } });
  }

  const number = input.number?.trim() ?? "";
  if (number) {
    const or = numberOr(number);
    if (or.length > 0) and.push({ OR: or });
  }

  const search = input.search?.trim() ?? "";
  if (search) {
    const or = cardSearchOr(search);
    if (or.length > 0) and.push({ OR: or });
  }

  if (input.pendingOnly) and.push({ pendingTranslation: true });

  const where = and.length ? { AND: and } : undefined;
  const [rows, total] = await Promise.all([
    prisma.catalogCard.findMany({
      where,
      include: { set: true },
      orderBy: [{ set: { code: "asc" } }, { sortIndex: "asc" }, { collectorNumber: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.catalogCard.count({ where }),
  ]);

  return {
    cards: rows.map((card) => ({
      id: card.id,
      setCode: card.set.code,
      setNameZhTw: card.set.nameZhTw,
      setNameJa: card.set.nameJa,
      setNameEn: card.set.nameEn,
      collectorNumber: card.collectorNumber,
      altCollectorNumber: card.altCollectorNumber,
      sortIndex: card.sortIndex,
      nameZhTw: card.nameZhTw,
      nameJa: card.nameJa,
      nameEn: card.nameEn,
      imageUrl: card.imageUrl,
      imageUrlJa: card.imageUrlJa,
      rarity: card.rarity,
      illustrator: card.illustrator,
      regulationMark: card.regulationMark,
      pendingTranslation: card.pendingTranslation,
      missingFields: splitMissingFields(card.missingFields),
    })),
    total,
    page,
    pageSize,
  };
}

export async function listCatalogChangelog(input: {
  setCode?: string | null;
  limit?: number;
}): Promise<CatalogChangelogDto[]> {
  const prisma = getPrisma();
  const setCode = input.setCode?.trim() ?? "";
  const rows = await prisma.catalogChangelog.findMany({
    where: setCode ? { setCode: { equals: setCode, mode: "insensitive" } } : undefined,
    orderBy: { date: "desc" },
    take: input.limit ?? 20,
  });
  return rows.map((row) => ({
    id: row.id,
    date: row.date.toISOString(),
    setCode: row.setCode,
    note: row.note,
  }));
}
