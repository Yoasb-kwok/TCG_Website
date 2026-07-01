import { Suspense } from "react";
import { CheckoutSuccessContent } from "@/components/checkout/checkout-success-content";

export const metadata = {
  title: "付款成功",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-24 text-center text-muted-foreground">
          載入中...
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
