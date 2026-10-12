import { CONDITIONS } from "@/lib/constants";
import { taxonomyFromCard } from "@/lib/card-taxonomy";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import {
  catalogCardMatchesProduct,
  catalogExternalId,
  catalogListingName,
  hktDayRange,
  pickBuybackVariant,
  prepareBuyback,
  type BuybackDraftInput,
} from "@/lib/pos-buyback";
import { createExpense, deleteExpense, readLedger, rememberBuyback, voidFileBuyback } from "@/lib/pos-ledger";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { slugifyProduct } from "@/lib/product-slug";
import type { Buyback } from "@/lib/pos-shared";

export type BuybackResult =
  | {
      ok: true;
      buyback: Buyback;
      stock: number | null;
      createdListing: boolean;
      needsSellPrice: boolean;
    }
  | { ok: false; error: string; status: number };

type BuybackRow = {
  id: string;
  createdAt: Date;
  source: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitBuyPrice: number;
  totalAmount: number;
  productId: string | null;
  variantId: string | null;
  catalogCardId: string | null;
  customerName: string;
  customerPhone: string;
  pokemonId: string;
  note: string;
  voided: boolean;
  expenseId: string | null;
};

const databaseRequired = { ok: false as const, error: "收銀資料庫未設定", status: 400 };

function toBuyback(row: BuybackRow): Buyback {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    source: "buyback",
    name: row.name,
    sku: row.sku,
    quantity: row.quantity,
    unitBuyPrice: row.unitBuyPrice,
    totalAmount: row.totalAmount,
    productId: row.productId,
    variantId: row.variantId,
    catalogCardId: row.catalogCardId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    pokemonId: row.pokemonId,
    note: row.note,
    voided: row.voided,
    expenseId: row.expenseId,
  };
}

function missingTable(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "P2021" || code === "P2022") return true;
  const message = error instanceof Error ? error.message : "";
  return message.includes("PosBuyback") || message.includes("does not exist");
}

function findDemoVariant(variantId: string) {
  for (const product of DEMO_PRODUCTS) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

function expenseNote(name: string, quantity: number) {
  return `收卡 ${name} × ${quantity}`;
}

export async function listTodayBuybacks(now = new Date()): Promise<Buyback[]> {
  const { from, to } = hktDayRange(now);
  if (!isDatabaseConfigured()) {
    const rows = (await readLedger()).buybacks.filter((row) => {
      const at = new Date(row.createdAt).getTime();
      return at >= from.getTime() && at <= to.getTime();
    });
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const prisma = getPrisma();
  const rows = await prisma.posBuyback.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toBuyback);
}

async function commitFileBuyback(draft: ReturnType<typeof prepareBuyback> & { ok: true }): Promise<BuybackResult> {
  const { draft: input } = draft;
  if (!input.variantId) {
    return { ok: false, error: "未設定資料庫，請先選擇已上架貨品", status: 400 };
  }
  const demo = findDemoVariant(input.variantId);
  if (!demo) return { ok: false, error: "找不到這件貨", status: 404 };

  const createdAt = new Date().toISOString();
  const expense = await createExpense({
    category: "GOODS",
    amount: input.totalAmount,
    note: expenseNote(demo.product.name, input.quantity),
    createdAt,
  });
  if (!expense.ok) return { ok: false, error: expense.error, status: 400 };

  const buyback: Buyback = {
    id: crypto.randomUUID(),
    createdAt,
    source: "buyback",
    name: demo.product.name,
    sku: demo.variant.sku,
    quantity: input.quantity,
    unitBuyPrice: input.unitBuyPrice,
    totalAmount: input.totalAmount,
    productId: demo.product.id,
    variantId: demo.variant.id,
    catalogCardId: input.catalogCardId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    pokemonId: input.pokemonId,
    note: input.note,
    voided: false,
    expenseId: expense.expense.id,
  };
  const saved = await rememberBuyback(buyback);
  if (!saved.ok) {
    await deleteExpense(expense.expense.id);
    return { ok: false, error: saved.error, status: 400 };
  }
  return {
    ok: true,
    buyback,
    stock: null,
    createdListing: false,
    needsSellPrice: demo.variant.price <= 0,
  };
}

async function loadCatalogCard(catalogCardId: string) {
  const prisma = getPrisma();
  return prisma.catalogCard.findUnique({
    where: { id: catalogCardId },
    include: { set: true },
  });
}

async function matchListedVariant(card: {
  id: string;
  collectorNumber: string;
  altCollectorNumber: string | null;
  set: { code: string };
}) {
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { externalCardId: catalogExternalId(card.id) },
        { setCode: { equals: card.set.code, mode: "insensitive" } },
        { cardSet: { equals: card.set.code, mode: "insensitive" } },
      ],
    },
    include: { variants: true },
  });
  const matches = products.filter((product) =>
    catalogCardMatchesProduct(
      {
        setCode: product.setCode,
        cardSet: product.cardSet,
        cardNumber: product.cardNumber,
        externalCardId: product.externalCardId,
      },
      {
        id: card.id,
        setCode: card.set.code,
        collectorNumber: card.collectorNumber,
        altCollectorNumber: card.altCollectorNumber,
      },
    ),
  );
  const product = matches.sort((a, b) => {
    const stock = (row: typeof a) => row.variants.reduce((sum, variant) => sum + variant.stock, 0);
    return stock(b) - stock(a);
  })[0];
  if (!product) return null;
  const variant = pickBuybackVariant(product.variants);
  if (!variant) return null;
  return { product, variant };
}

async function createListing(card: {
  id: string;
  collectorNumber: string;
  nameZhTw: string | null;
  nameJa: string | null;
  nameEn: string | null;
  imageUrl: string | null;
  rarity: string | null;
  set: { code: string; nameZhTw: string | null };
}) {
  const prisma = getPrisma();
  const name = catalogListingName({
    nameZhTw: card.nameZhTw,
    nameJa: card.nameJa,
    nameEn: card.nameEn,
    setCode: card.set.code,
    collectorNumber: card.collectorNumber,
  }).slice(0, 200);
  const taxonomy = taxonomyFromCard({
    setCode: card.set.code,
    rarity: card.rarity,
    name,
  });
  let slug = slugifyProduct(name, `${card.set.code}-${card.collectorNumber}`) || `buyback-${card.id.slice(0, 8)}`;
  slug = slug.slice(0, 80);
  const slugTaken = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (slugTaken) slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 80);

  let sku = `${slug}-nm`.slice(0, 64);
  const skuTaken = await prisma.productVariant.findUnique({ where: { sku }, select: { id: true } });
  if (skuTaken) sku = `bb-${crypto.randomUUID().slice(0, 8)}`.slice(0, 64);

  const created = await prisma.product.create({
    data: {
      name,
      slug,
      description: [card.set.code, `#${card.collectorNumber}`, "收卡入庫，售價未定"].join(" · "),
      type: "SINGLE",
      cardSet: card.set.nameZhTw || card.set.code,
      cardNumber: card.collectorNumber,
      rarity: card.rarity,
      setCode: card.set.code,
      rarityTier: taxonomy.rarityTier,
      setSortIndex: taxonomy.setSortIndex,
      raritySortIndex: taxonomy.raritySortIndex,
      language: "zh-HK",
      externalCardId: catalogExternalId(card.id),
      images: card.imageUrl
        ? { create: { url: card.imageUrl, alt: name, sortOrder: 0 } }
        : undefined,
      variants: {
        create: {
          condition: CONDITIONS[0],
          isFoil: false,
          price: 0,
          stock: 0,
          sku,
        },
      },
    },
    include: { variants: true },
  });
  const variant = created.variants[0];
  if (!variant) throw new Error("未能建立收卡庫存");
  return { product: created, variant, createdListing: true as const };
}

export async function commitBuyback(input: BuybackDraftInput): Promise<BuybackResult> {
  const prepared = prepareBuyback(input);
  if (!prepared.ok) return { ok: false, error: prepared.error, status: 400 };
  if (!isDatabaseConfigured()) {
    if (process.env.VERCEL) return databaseRequired;
    return commitFileBuyback(prepared);
  }

  const prisma = getPrisma();
  let createdProductId: string | null = null;
  try {
    let productId: string;
    let variantId: string;
    let name: string;
    let sku: string | null;
    let sellPrice: number;
    let createdListing = false;

    if (prepared.draft.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: prepared.draft.variantId },
        include: { product: { select: { id: true, name: true } } },
      });
      if (!variant) return { ok: false, error: "找不到這件貨", status: 404 };
      productId = variant.product.id;
      variantId = variant.id;
      name = variant.product.name;
      sku = variant.sku;
      sellPrice = variant.price;
    } else {
      const card = await loadCatalogCard(prepared.draft.catalogCardId ?? "");
      if (!card) return { ok: false, error: "找不到這張卡", status: 404 };
      const listed = await matchListedVariant(card);
      if (listed) {
        productId = listed.product.id;
        variantId = listed.variant.id;
        name = listed.product.name;
        sku = listed.variant.sku;
        sellPrice = listed.variant.price;
      } else {
        const created = await createListing(card);
        createdProductId = created.product.id;
        productId = created.product.id;
        variantId = created.variant.id;
        name = created.product.name;
        sku = created.variant.sku;
        sellPrice = 0;
        createdListing = true;
      }
    }

    const now = new Date();
    const expenseId = crypto.randomUUID();
    const buybackId = crypto.randomUUID();
    const [updated] = await prisma.$transaction([
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: prepared.draft.quantity } },
      }),
      prisma.posExpense.create({
        data: {
          id: expenseId,
          createdAt: now,
          category: "GOODS",
          amount: prepared.draft.totalAmount,
          note: expenseNote(name, prepared.draft.quantity),
        },
      }),
      prisma.posBuyback.create({
        data: {
          id: buybackId,
          createdAt: now,
          source: "buyback",
          name,
          sku,
          quantity: prepared.draft.quantity,
          unitBuyPrice: prepared.draft.unitBuyPrice,
          totalAmount: prepared.draft.totalAmount,
          productId,
          variantId,
          catalogCardId: prepared.draft.catalogCardId,
          customerName: prepared.draft.customerName,
          customerPhone: prepared.draft.customerPhone,
          pokemonId: prepared.draft.pokemonId,
          note: prepared.draft.note,
          voided: false,
          expenseId,
        },
      }),
    ]);

    return {
      ok: true,
      buyback: {
        id: buybackId,
        createdAt: now.toISOString(),
        source: "buyback",
        name,
        sku,
        quantity: prepared.draft.quantity,
        unitBuyPrice: prepared.draft.unitBuyPrice,
        totalAmount: prepared.draft.totalAmount,
        productId,
        variantId,
        catalogCardId: prepared.draft.catalogCardId,
        customerName: prepared.draft.customerName,
        customerPhone: prepared.draft.customerPhone,
        pokemonId: prepared.draft.pokemonId,
        note: prepared.draft.note,
        voided: false,
        expenseId,
      },
      stock: updated.stock,
      createdListing,
      needsSellPrice: sellPrice <= 0,
    };
  } catch (error) {
    if (createdProductId) {
      await prisma.product.delete({ where: { id: createdProductId } }).catch(() => undefined);
    }
    if (missingTable(error)) {
      return { ok: false, error: "收卡資料表未就緒，請先執行 npm run db:migrate", status: 503 };
    }
    throw error;
  }
}

export async function voidBuyback(id: string): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const buybackId = id.trim();
  if (!buybackId) return { ok: false, error: "找不到這筆收卡", status: 400 };
  if (!isDatabaseConfigured()) {
    if (process.env.VERCEL) return databaseRequired;
    const result = await voidFileBuyback(buybackId);
    if (!result.ok) return { ok: false, error: result.error, status: 404 };
    if (result.alreadyVoided) return { ok: false, error: "這筆收卡已經撤銷", status: 400 };
    if (result.buyback.expenseId) await deleteExpense(result.buyback.expenseId);
    return { ok: true };
  }

  const prisma = getPrisma();
  try {
    const row = await prisma.posBuyback.findUnique({ where: { id: buybackId } });
    if (!row) return { ok: false, error: "找不到這筆收卡", status: 404 };
    if (row.voided) return { ok: false, error: "這筆收卡已經撤銷", status: 400 };
    await prisma.$transaction(async (tx) => {
      await tx.posBuyback.update({ where: { id: buybackId }, data: { voided: true } });
      if (row.expenseId) await tx.posExpense.deleteMany({ where: { id: row.expenseId } });
      if (row.variantId) {
        const variant = await tx.productVariant.findUnique({ where: { id: row.variantId } });
        if (variant) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: Math.max(0, variant.stock - row.quantity) },
          });
        }
      }
    });
    return { ok: true };
  } catch (error) {
    if (missingTable(error)) {
      return { ok: false, error: "收卡資料表未就緒，請先執行 npm run db:migrate", status: 503 };
    }
    throw error;
  }
}
