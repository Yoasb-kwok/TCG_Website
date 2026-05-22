import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">付款已取消</h1>
      <p className="mt-2 text-muted-foreground">你的購物車內容已保留。</p>
      <Link
        href="/products"
        className="mt-8 inline-flex h-9 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
      >
        返回商品
      </Link>
    </div>
  );
}
