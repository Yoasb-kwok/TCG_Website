import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/marketplace/product-detail";
import { getProductBySlug } from "@/lib/products";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "找不到商品" };
  return {
    title: product.name,
    description: product.description ?? product.name,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
