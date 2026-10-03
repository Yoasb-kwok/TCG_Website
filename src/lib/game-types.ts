import { getPrisma } from "@/lib/prisma";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listActiveGameTypes() {
  const prisma = getPrisma();
  return prisma.gameType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listAllGameTypes() {
  const prisma = getPrisma();
  return prisma.gameType.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function getGameTypeBySlug(slug: string) {
  const prisma = getPrisma();
  return prisma.gameType.findUnique({ where: { slug } });
}

export async function getGameTypeById(id: string) {
  const prisma = getPrisma();
  return prisma.gameType.findUnique({ where: { id } });
}

export async function createGameType(input: {
  name: string;
  slug?: string;
  sortOrder?: number;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("名稱不可為空");

  const slug = input.slug?.trim() || slugify(name);
  if (!slug) throw new Error("無法從名稱生成 slug");

  const prisma = getPrisma();
  return prisma.gameType.create({
    data: {
      name,
      slug,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    },
  });
}

export async function updateGameType(
  id: string,
  input: {
    name?: string;
    slug?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.slug !== undefined) data.slug = input.slug.trim();
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const prisma = getPrisma();
  return prisma.gameType.update({ where: { id }, data });
}

export async function deleteGameType(id: string): Promise<void> {
  const prisma = getPrisma();

  const [productCount, taxonomyCount] = await Promise.all([
    prisma.product.count({ where: { gameTypeId: id } }),
    prisma.taxonomyOption.count({ where: { gameTypeId: id } }),
  ]);

  if (productCount > 0 || taxonomyCount > 0) {
    throw new Error(
      `無法刪除：仍有 ${productCount} 個商品和 ${taxonomyCount} 個標籤關聯到此遊戲`,
    );
  }

  await prisma.gameType.delete({ where: { id } });
}
