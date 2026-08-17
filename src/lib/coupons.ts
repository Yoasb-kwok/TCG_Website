import { getPrisma } from "@/lib/prisma";

export interface CouponInput {
  name: string;
  code?: string;
  description: string;
  quantity: number;
  isActive?: boolean;
}

/**
 * Generate a URL-safe coupon code from a name.
 * Same slugify pattern as GameType.slug.
 */
export function generateCouponCode(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Coupon = Awaited<ReturnType<ReturnType<typeof getPrisma>["coupon"]["findUnique"]>>;
type CouponCreateInput = Parameters<ReturnType<typeof getPrisma>["coupon"]["create"]>[0]["data"];

export async function listCoupons() {
  const prisma = getPrisma();
  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createCoupon(input: CouponInput) {
  if (!input.name.trim()) {
    throw new Error("優惠券名稱不可為空");
  }
  if (input.quantity < 0) {
    throw new Error("數量不可為負數");
  }

  const code = input.code?.trim() || generateCouponCode(input.name);
  const prisma = getPrisma();

  const data: CouponCreateInput = {
    name: input.name.trim(),
    code,
    description: input.description,
    quantity: input.quantity,
    isActive: input.isActive ?? true,
  };

  return prisma.coupon.create({ data });
}

export async function updateCoupon(
  id: string,
  input: Partial<CouponInput>,
) {
  const prisma = getPrisma();
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("優惠券不存在");
  }

  if (input.quantity !== undefined && input.quantity < 0) {
    throw new Error("數量不可為負數");
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.code !== undefined) data.code = input.code.trim();
  if (input.description !== undefined) data.description = input.description;
  if (input.quantity !== undefined) data.quantity = input.quantity;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return prisma.coupon.update({ where: { id }, data });
}

export async function deleteCoupon(id: string): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("優惠券不存在");
  }
  await prisma.coupon.delete({ where: { id } });
}
