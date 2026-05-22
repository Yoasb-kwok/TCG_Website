import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
      <h1 className="mt-6 text-2xl font-bold text-foreground">付款成功！</h1>
      <p className="mt-2 text-muted-foreground">
        多謝你的訂購。我們會盡快處理你的訂單並發送確認電郵。
      </p>
      <Link
        href="/products"
        className="mt-8 inline-flex h-9 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
      >
        繼續購物
      </Link>
    </div>
  );
}
