import { DEMO_SHOP } from "@/lib/demo-shop";
import { SITE_BRAND } from "@/lib/constants";

export function DemoStoreFooter() {
  return (
    <footer className="mx-auto mt-auto mb-12 w-full max-w-[1280px] rounded-[14px] bg-[#080808] px-4 py-10 text-sm text-white/80 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-base font-semibold tracking-tight text-white">{DEMO_SHOP.name}</p>
        <p>
          {DEMO_SHOP.address.zh}
          <span className="mx-2 text-slate-600">·</span>
          {DEMO_SHOP.address.en}
        </p>
        <p>
          {DEMO_SHOP.mtr}
          <span className="mx-2 text-slate-600">·</span>
          {DEMO_SHOP.hours}
        </p>
        <p className="pt-3 text-xs text-slate-500">示範店舖 · 由 {SITE_BRAND} 提供 · 結帳不會成立真實訂單</p>
      </div>
    </footer>
  );
}
