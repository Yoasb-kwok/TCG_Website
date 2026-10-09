import type { PrismaClient } from "@/generated/prisma/client";

const PAGE_SIZE = 30;
const MAX_POKEMON_ID_LENGTH = 64;
const MAX_POINTS = 1_000_000_000;

export type AccountUpdate = {
  pokemonId: string | null;
  points: number;
};

export function parseAccountUpdate(
  body: unknown,
): { ok: true; data: AccountUpdate } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "資料格式不正確" };
  }

  const raw = body as { pokemonId?: unknown; points?: unknown };

  if (raw.pokemonId !== undefined && raw.pokemonId !== null && typeof raw.pokemonId !== "string") {
    return { ok: false, error: "Pokémon ID 格式不正確" };
  }

  const pokemonIdRaw = typeof raw.pokemonId === "string" ? raw.pokemonId.trim() : "";
  if (pokemonIdRaw.length > MAX_POKEMON_ID_LENGTH) {
    return { ok: false, error: "Pokémon ID 不可超過 64 個字元" };
  }
  if (/[\u0000-\u001F]/.test(pokemonIdRaw)) {
    return { ok: false, error: "Pokémon ID 格式不正確" };
  }

  const points = parsePoints(raw.points);
  if (points == null || points < 0 || points > MAX_POINTS) {
    return { ok: false, error: "積分必須為 0 或以上的整數" };
  }

  return {
    ok: true,
    data: {
      pokemonId: pokemonIdRaw.length > 0 ? pokemonIdRaw : null,
      points,
    },
  };
}

function parsePoints(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

const accountSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  pokemonId: true,
  points: true,
  createdAt: true,
} as const;

type AccountIdentity = { id: string; email: string };

function purchaseFilter(user: AccountIdentity) {
  return {
    OR: [
      { userId: user.id },
      { email: { equals: user.email, mode: "insensitive" as const } },
    ],
  };
}

function orderMatchesUser(
  order: { userId: string | null; email: string },
  user: AccountIdentity,
) {
  return (
    order.userId === user.id || order.email.toLowerCase() === user.email.toLowerCase()
  );
}

const orderInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  },
} as const;

export async function listAccounts(
  prisma: PrismaClient,
  search: string | undefined,
  page: number,
) {
  const query = search?.trim();
  const where = query
    ? {
        OR: [
          { email: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query, mode: "insensitive" as const } },
          { pokemonId: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: accountSelect,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const purchaseCount = await countPurchases(prisma, users);

  return {
    users: users.map((user) => ({
      ...user,
      purchaseCount: purchaseCount.get(user.id) ?? 0,
    })),
    total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

async function countPurchases(prisma: PrismaClient, users: AccountIdentity[]) {
  const counts = new Map<string, number>();
  for (const user of users) counts.set(user.id, 0);
  if (users.length === 0) return counts;

  const orders = await prisma.order.findMany({
    where: {
      OR: users.map((user) => purchaseFilter(user)).flatMap((filter) => filter.OR),
    },
    select: { userId: true, email: true },
  });

  for (const order of orders) {
    for (const user of users) {
      if (!orderMatchesUser(order, user)) continue;
      counts.set(user.id, (counts.get(user.id) ?? 0) + 1);
    }
  }

  return counts;
}

export async function getAccountDetail(prisma: PrismaClient, id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: accountSelect,
  });
  if (!user) return null;

  const orders = await prisma.order.findMany({
    where: purchaseFilter(user),
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return { user, orders };
}

export async function updateAccount(
  prisma: PrismaClient,
  id: string,
  data: AccountUpdate,
) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.user.update({
    where: { id },
    data: {
      pokemonId: data.pokemonId,
      points: data.points,
    },
    select: accountSelect,
  });
}
