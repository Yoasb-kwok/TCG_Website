import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">找不到此商品</h1>
      <p className="mt-2 text-muted-foreground">商品可能已下架，或連結不正確。</p>
      <Link
        href="/products"
        className="mt-6 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
      >
        返回商品
      </Link>
    </div>
  );
}
