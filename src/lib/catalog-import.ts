import type { PrismaClient } from "@/generated/prisma/client";
import {
  CatalogImportError,
  type CatalogCardDraft,
  type CatalogSetDraft,
  mergeCatalogCard,
  parseCatalogCsv,
} from "@/lib/catalog-csv";

export interface CatalogImportSetResult {
  setCode: string;
  created: number;
  updated: number;
  unchanged: number;
  pendingTranslation: number;
  changelogId: string;
  note: string;
}

export interface CatalogImportResult {
  sets: CatalogImportSetResult[];
  warnings: string[];
}

function sameCard(left: CatalogCardDraft, right: CatalogCardDraft): boolean {
  return (
    left.collectorNumber === right.collectorNumber &&
    left.altCollectorNumber === right.altCollectorNumber &&
    left.sortIndex === right.sortIndex &&
    left.nameZhTw === right.nameZhTw &&
    left.nameJa === right.nameJa &&
    left.nameEn === right.nameEn &&
    left.imageUrl === right.imageUrl &&
    left.imageUrlJa === right.imageUrlJa &&
    left.rarity === right.rarity &&
    left.illustrator === right.illustrator &&
    left.regulationMark === right.regulationMark &&
    left.pendingTranslation === right.pendingTranslation &&
    left.missingFields === right.missingFields
  );
}

function draftFromRow(row: {
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
  missingFields: string;
}): CatalogCardDraft {
  return {
    collectorNumber: row.collectorNumber,
    altCollectorNumber: row.altCollectorNumber,
    sortIndex: row.sortIndex,
    nameZhTw: row.nameZhTw ?? "",
    nameJa: row.nameJa,
    nameEn: row.nameEn,
    imageUrl: row.imageUrl,
    imageUrlJa: row.imageUrlJa,
    rarity: row.rarity,
    illustrator: row.illustrator,
    regulationMark: row.regulationMark,
    pendingTranslation: row.pendingTranslation,
    missingFields: row.missingFields,
  };
}

export async function importCatalogCsv(
  prisma: PrismaClient,
  csvText: string,
  options: { setCode?: string; note?: string } = {},
): Promise<CatalogImportResult> {
  const prepared = parseCatalogCsv(csvText, { setCode: options.setCode });
  const sets = await prisma.$transaction(async (tx) => {
    const results: CatalogImportSetResult[] = [];
    for (const draft of prepared.sets) {
      results.push(await importOneSet(tx, draft, options.note?.trim() ?? ""));
    }
    return results;
  });
  return { sets, warnings: prepared.warnings };
}

async function importOneSet(
  tx: Pick<PrismaClient, "catalogSet" | "catalogCard" | "catalogChangelog">,
  draft: CatalogSetDraft,
  userNote: string,
): Promise<CatalogImportSetResult> {
  const existingSet = await tx.catalogSet.findUnique({ where: { code: draft.code } });
  const set = existingSet
    ? await tx.catalogSet.update({
        where: { id: existingSet.id },
        data: {
          nameZhTw: draft.nameZhTw ?? existingSet.nameZhTw,
          nameJa: draft.nameJa ?? existingSet.nameJa,
          nameEn: draft.nameEn ?? existingSet.nameEn,
          releaseDate: draft.releaseDate ?? existingSet.releaseDate,
          regulationMark: draft.regulationMark ?? existingSet.regulationMark,
          officialUrl: draft.officialUrl ?? existingSet.officialUrl,
        },
      })
    : await tx.catalogSet.create({
        data: {
          code: draft.code,
          nameZhTw: draft.nameZhTw,
          nameJa: draft.nameJa,
          nameEn: draft.nameEn,
          releaseDate: draft.releaseDate,
          regulationMark: draft.regulationMark,
          officialUrl: draft.officialUrl,
        },
      });

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const incoming of draft.cards) {
    const current = await tx.catalogCard.findUnique({
      where: { setId_collectorNumber: { setId: set.id, collectorNumber: incoming.collectorNumber } },
    });
    const merged = mergeCatalogCard(current ? draftFromRow(current) : null, incoming);
    if (!current) {
      await tx.catalogCard.create({
        data: { setId: set.id, ...merged },
      });
      created += 1;
      continue;
    }
    if (sameCard(draftFromRow(current), merged)) {
      unchanged += 1;
      continue;
    }
    await tx.catalogCard.update({
      where: { id: current.id },
      data: merged,
    });
    updated += 1;
  }

  const [totalCards, pendingTranslation] = await Promise.all([
    tx.catalogCard.count({ where: { setId: set.id } }),
    tx.catalogCard.count({ where: { setId: set.id, pendingTranslation: true } }),
  ]);
  await tx.catalogSet.update({
    where: { id: set.id },
    data: { totalCards },
  });

  const counts = `新增 ${created}、更新 ${updated}、未改 ${unchanged}、待補譯名 ${pendingTranslation}`;
  const note = userNote ? `${userNote} ${counts}。` : `匯入 ${draft.code}：${counts}。`;
  const changelog = await tx.catalogChangelog.create({
    data: {
      setCode: draft.code,
      note,
    },
  });

  return {
    setCode: draft.code,
    created,
    updated,
    unchanged,
    pendingTranslation,
    changelogId: changelog.id,
    note,
  };
}

export function isCatalogImportError(error: unknown): error is CatalogImportError {
  return error instanceof CatalogImportError;
}
