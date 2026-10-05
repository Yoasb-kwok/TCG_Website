import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function setReceivedStock(variantId: string, quantity: number, unitPrice: number) {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { id: true, name: true } } },
  });
  if (!variant) return null;
  const updated = await prisma.productVariant.update({
    where: { id: variant.id },
    data: { stock: variant.stock + quantity, price: unitPrice },
  });
  return { previousStock: variant.stock, stock: updated.stock, productId: variant.product.id, name: variant.product.name, sku: variant.sku };
}

export async function undoReceivedStock(variantId: string, quantity: number) {
  if (!isDatabaseConfigured()) return;
  const prisma = getPrisma();
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return;
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { stock: Math.max(0, variant.stock - quantity) },
  });
}

export async function adjustStockBySku(sku: string | null, delta: number) {
  if (!sku || !isDatabaseConfigured() || delta === 0) return;
  try {
    const prisma = getPrisma();
    const variant = await prisma.productVariant.findUnique({ where: { sku } });
    if (!variant) return;
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: Math.max(0, variant.stock + delta) },
    });
  } catch {
    return;
  }
}
