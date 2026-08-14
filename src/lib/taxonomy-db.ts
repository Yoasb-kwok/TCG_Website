import { generateCardNumberRange, replaceCardNumberSuffix, cardNumberLabel } from "@/lib/card-number-format";
import { DEFAULT_TAXONOMY_ROWS } from "@/lib/taxonomy-defaults";
import type { TaxonomyKind, TaxonomyOptionDto } from "@/lib/taxonomy-types";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/** 避免 dev HMR 沿用舊 Prisma client（無 taxonomyOption → .count 報錯） */
function taxonomy(prisma: PrismaClient) {
  const delegate = (
    prisma as PrismaClient & { taxonomyOption?: PrismaClient["taxonomyOption"] }
  ).taxonomyOption;
  if (!delegate) {
    throw new Error(
      "Prisma 尚未包含 TaxonomyOption 模型。請執行 npm run db:generate 後重啟 npm run dev。",
    );
  }
  return delegate;
}

function mapRow(row: {
  id: string;
  kind: string;
  value: string;
  label: string;
  sortIndex: number;
  parentValue: string | null;
  cardSuffix?: string | null;
  active: boolean;
}): TaxonomyOptionDto {
  return {
    id: row.id,
    kind: row.kind as TaxonomyKind,
    value: row.value,
    label: row.label,
    sortIndex: row.sortIndex,
    parentValue: row.parentValue,
    cardSuffix: row.cardSuffix ?? null,
    active: row.active,
  };
}

const DEFAULT_PRODUCT_TYPE_ROWS = [
  { value: "SINGLE", label: "單卡", sortIndex: 0 },
  { value: "SEALED_BOX", label: "封盒", sortIndex: 1 },
  { value: "BOOSTER_PACK", label: "補充包", sortIndex: 2 },
  { value: "GIFT_BOX", label: "禮盒", sortIndex: 3 },
  { value: "ACCESSORY", label: "配件", sortIndex: 4 },
] as const;

/** 確保商品類型標籤存在（新環境或舊庫升級） */
export async function ensureProductTypeTaxonomy() {
  if (!isDatabaseConfigured()) return;
  const prisma = getPrisma();
  const tx = taxonomy(prisma);
  for (const row of DEFAULT_PRODUCT_TYPE_ROWS) {
    // Prisma upsert 不支援複合唯一鍵中 parentValue 為 null
    const existing = await tx.findFirst({
      where: {
        kind: "PRODUCT_TYPE",
        value: row.value,
        parentValue: null,
      },
    });
    if (existing) {
      await tx.update({
        where: { id: existing.id },
        data: {
          label: row.label,
          sortIndex: row.sortIndex,
          active: true,
        },
      });
    } else {
      await tx.create({
        data: {
          kind: "PRODUCT_TYPE",
          value: row.value,
          label: row.label,
          sortIndex: row.sortIndex,
          parentValue: null,
        },
      });
    }
  }
}

export async function ensureDefaultTaxonomy() {
  if (!isDatabaseConfigured()) return;
  const prisma = getPrisma();
  const count = await taxonomy(prisma).count();
  if (count === 0) {
    await taxonomy(prisma).createMany({
      data: DEFAULT_TAXONOMY_ROWS.map((row) => ({
        kind: row.kind,
        value: row.value,
        label: row.label,
        sortIndex: row.sortIndex,
        parentValue: row.parentValue ?? null,
      })),
    });
  }
  await ensureProductTypeTaxonomy();
}

export async function listTaxonomyOptions(
  kind?: TaxonomyKind,
  parentValue?: string | null,
  activeOnly = true,
  /// ADR-006: Filter by game type. Includes shared (null) + game-specific options.
  gameTypeId?: string,
): Promise<TaxonomyOptionDto[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureDefaultTaxonomy();
  const prisma = getPrisma();

  const rows = await taxonomy(prisma).findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(parentValue !== undefined
        ? { parentValue: parentValue ?? null }
        : {}),
      ...(activeOnly ? { active: true } : {}),
      ...(gameTypeId
        ? { OR: [{ gameTypeId: null }, { gameTypeId }] }
        : {}),
    },
    orderBy: [{ kind: "asc" }, { sortIndex: "asc" }, { label: "asc" }],
  });

  return rows.map(mapRow);
}

export async function listTaxonomyGrouped(
  activeOnly = false,
  gameTypeId?: string,
): Promise<Record<TaxonomyKind, TaxonomyOptionDto[]>> {
  const all = await listTaxonomyOptions(undefined, undefined, activeOnly, gameTypeId);
  await ensureProductTypeTaxonomy();

  const grouped = {
    SET_CODE: [] as TaxonomyOptionDto[],
    RARITY: [] as TaxonomyOptionDto[],
    CARD_NUMBER: [] as TaxonomyOptionDto[],
    CARD_CATEGORY: [] as TaxonomyOptionDto[],
    POKEMON_ATTRIBUTE: [] as TaxonomyOptionDto[],
    PRODUCT_TYPE: [] as TaxonomyOptionDto[],
  };
  for (const row of all) {
    if (grouped[row.kind]) grouped[row.kind].push(row);
  }
  return grouped;
}

export async function getTaxonomySortMaps() {
  const [sets, rarities] = await Promise.all([
    listTaxonomyOptions("SET_CODE"),
    listTaxonomyOptions("RARITY"),
  ]);
  return {
    setCode: Object.fromEntries(sets.map((s) => [s.value, s.sortIndex])),
    rarityTier: Object.fromEntries(rarities.map((r) => [r.value, r.sortIndex])),
  };
}

export function getSortIndexFromMap(
  map: Record<string, number>,
  value: string | null | undefined,
  fallback: number,
) {
  if (!value) return fallback;
  return map[value] ?? fallback;
}

export async function createTaxonomyOption(input: {
  kind: TaxonomyKind;
  value: string;
  label: string;
  parentValue?: string | null;
  cardSuffix?: string | null;
}) {
  const prisma = getPrisma();
  const max = await taxonomy(prisma).aggregate({
    where: { kind: input.kind, parentValue: input.parentValue ?? null },
    _max: { sortIndex: true },
  });
  const sortIndex = (max._max?.sortIndex ?? -1) + 1;

  const row = await taxonomy(prisma).create({
    data: {
      kind: input.kind,
      value: input.value.trim(),
      label: input.label.trim(),
      parentValue: input.parentValue?.trim() || null,
      cardSuffix:
        input.kind === "SET_CODE" && input.cardSuffix !== undefined
          ? input.cardSuffix?.replace(/^\//, "").trim() || null
          : undefined,
      sortIndex,
    },
  });
  return mapRow(row);
}

export async function updateTaxonomyOption(
  id: string,
  data: Partial<{
    label: string;
    value: string;
    parentValue: string | null;
    cardSuffix: string | null;
    active: boolean;
  }>,
) {
  const prisma = getPrisma();
  const existing = await taxonomy(prisma).findUnique({ where: { id } });
  const row = await taxonomy(prisma).update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label.trim() } : {}),
      ...(data.value !== undefined ? { value: data.value.trim() } : {}),
      ...(data.parentValue !== undefined
        ? { parentValue: data.parentValue?.trim() || null }
        : {}),
      ...(data.cardSuffix !== undefined
        ? { cardSuffix: data.cardSuffix?.replace(/^\//, "").trim() || null }
        : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });

  if (
    existing?.kind === "SET_CODE" &&
    data.cardSuffix !== undefined &&
    existing.value
  ) {
    const newSuffix = data.cardSuffix?.replace(/^\//, "").trim() || null;
    if (newSuffix && newSuffix !== existing.cardSuffix) {
      await syncCardNumbersToSuffix(existing.value, newSuffix);
    }
  }

  return mapRow(row);
}

export async function syncCardNumbersToSuffix(setCode: string, newSuffix: string) {
  const clean = newSuffix.replace(/^\//, "").trim();
  if (!clean) return { cardNumbers: 0, products: 0 };

  const prisma = getPrisma();
  const tx = taxonomy(prisma);

  const cardNumbers = await tx.findMany({
    where: { kind: "CARD_NUMBER", parentValue: setCode.trim() },
  });

  let cardNumberUpdates = 0;
  for (const row of cardNumbers) {
    const updated = replaceCardNumberSuffix(row.value, clean);
    if (!updated || updated === row.value) continue;
    await tx.update({
      where: { id: row.id },
      data: { value: updated, label: cardNumberLabel(updated) },
    });
    cardNumberUpdates++;
  }

  const products = await prisma.product.findMany({
    where: { setCode: setCode.trim(), cardNumber: { not: null } },
    select: { id: true, cardNumber: true },
  });

  let productUpdates = 0;
  for (const product of products) {
    if (!product.cardNumber) continue;
    const updated = replaceCardNumberSuffix(product.cardNumber, clean);
    if (!updated || updated === product.cardNumber) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { cardNumber: updated },
    });
    productUpdates++;
  }

  return { cardNumbers: cardNumberUpdates, products: productUpdates };
}

export async function saveSetCardSuffix(setCode: string, suffix: string) {
  const prisma = getPrisma();
  const clean = suffix.replace(/^\//, "").trim();
  if (!clean) throw new Error("請填寫固定編號");
  const setRow = await taxonomy(prisma).findFirst({
    where: { kind: "SET_CODE", value: setCode.trim() },
  });
  if (!setRow) throw new Error("找不到系列");

  const row = await taxonomy(prisma).update({
    where: { id: setRow.id },
    data: { cardSuffix: clean },
  });

  if (setRow.cardSuffix !== clean) {
    await syncCardNumbersToSuffix(setCode, clean);
  }

  return mapRow(row);
}

export async function batchGenerateCardNumbers(input: {
  setCode: string;
  suffix: string;
  min: number;
  max: number;
  padWidth?: number;
}) {
  const setCode = input.setCode.trim();
  const suffix = input.suffix.replace(/^\//, "").trim();
  if (!setCode) throw new Error("請選擇系列");
  if (!suffix) throw new Error("請填寫固定編號（/ 後面的數字）");
  const min = Math.floor(input.min);
  const max = Math.floor(input.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error("請填寫有效的最小與最大編號");
  }
  if (min < 0 || max < 0) throw new Error("編號不可為負數");
  if (min > max) throw new Error("最小編號不可大於最大編號");
  const count = max - min + 1;
  if (count > 500) throw new Error("一次最多產生 500 筆卡號");

  const prisma = getPrisma();
  await saveSetCardSuffix(setCode, suffix);

  const items = generateCardNumberRange(
    min,
    max,
    suffix,
    input.padWidth ?? 3,
  );

  const existing = await taxonomy(prisma).findMany({
    where: { kind: "CARD_NUMBER", parentValue: setCode },
    select: { value: true },
  });
  const existingSet = new Set(existing.map((e) => e.value));

  const maxSort = await taxonomy(prisma).aggregate({
    where: { kind: "CARD_NUMBER", parentValue: setCode },
    _max: { sortIndex: true },
  });
  let sortIndex = (maxSort._max?.sortIndex ?? -1) + 1;

  const toCreate = items.filter((item) => !existingSet.has(item.value));
  if (toCreate.length === 0) {
    return { created: 0, skipped: items.length, total: items.length };
  }

  await taxonomy(prisma).createMany({
    data: toCreate.map((item) => ({
      kind: "CARD_NUMBER" as const,
      value: item.value,
      label: item.label,
      parentValue: setCode,
      sortIndex: sortIndex++,
    })),
    skipDuplicates: true,
  });

  return {
    created: toCreate.length,
    skipped: items.length - toCreate.length,
    total: items.length,
  };
}

export async function deleteTaxonomyOption(id: string) {
  const prisma = getPrisma();
  await taxonomy(prisma).delete({ where: { id } });
}

export async function reorderTaxonomyOptions(
  kind: TaxonomyKind,
  orderedIds: string[],
  parentValue?: string | null,
) {
  const prisma = getPrisma();
  const tx = taxonomy(prisma);
  await prisma.$transaction(
    orderedIds.map((id, sortIndex) =>
      tx.update({
        where: { id },
        data: { sortIndex },
      }),
    ),
  );
  return listTaxonomyOptions(kind, parentValue);
}

export async function getTaxonomyLabel(
  kind: TaxonomyKind,
  value?: string | null,
): Promise<string> {
  if (!value) return "—";
  const options = await listTaxonomyOptions(kind);
  return options.find((o) => o.value === value)?.label ?? value;
}
