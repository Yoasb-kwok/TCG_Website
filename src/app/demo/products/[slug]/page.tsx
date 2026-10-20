import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/marketplace/product-detail";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { DEMO_STORE_PATH, getDemoProductBySlug } from "@/lib/demo-shop";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return DEMO_PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getDemoProductBySlug(slug);
  if (!product) return { title: "找不到商品" };
  return { title: product.name, description: product.description ?? product.name };
}

export default async function DemoProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getDemoProductBySlug(slug);
  if (!product) notFound();
  return <ProductDetail product={product} catalogHref={DEMO_STORE_PATH} />;
}
