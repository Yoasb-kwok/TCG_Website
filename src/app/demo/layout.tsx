import { DemoChrome } from "@/components/demo/demo-chrome";
import { DemoStoreFooter } from "@/components/demo/demo-store-footer";
import { DemoStoreHeader } from "@/components/demo/demo-store-header";
import { DEMO_CART_STORAGE_KEY, demoTrialWhatsAppHref } from "@/lib/demo-shop";
import { resolveWhatsAppHref } from "@/lib/whatsapp";
import { CartProvider } from "@/providers/cart-provider";

export const metadata = {
  title: "旺角示範卡店",
  description: "TCGHK 公開示範店。可以瀏覽商品同放入購物車，結帳不會成立真實訂單。",
};

export default function DemoStoreLayout({ children }: { children: React.ReactNode }) {
  const trialHref = demoTrialWhatsAppHref(resolveWhatsAppHref());
  return (
    <CartProvider storageKey={DEMO_CART_STORAGE_KEY}>
      <div className="demo-night flex min-h-full flex-1 flex-col bg-[#070b14] text-slate-100 [color-scheme:dark]">
        <DemoChrome trialHref={trialHref} />
        <DemoStoreHeader />
        <main className="flex-1">{children}</main>
        <DemoStoreFooter />
      </div>
    </CartProvider>
  );
}
